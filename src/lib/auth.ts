    import { PrismaAdapter } from "@next-auth/prisma-adapter"
    import { prisma } from "@/lib/prisma"
    import bcrypt from "bcrypt"
    import GoogleProvider from "next-auth/providers/google"
    import FacebookProvider from "next-auth/providers/facebook"
    import AppleProvider from "next-auth/providers/apple"
    import CredentialsProvider from "next-auth/providers/credentials"
    import { NextAuthOptions } from "next-auth"
    import fs from "fs";

    const LOG_FILE = "/tmp/emm_debug.log";
    function logToFile(msg: string) {
        fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${msg}\n`);
    }

    const buildAuthOptions = ({
        cookiePrefix,
        signInPage,
        requireAdmin,
    }: {
        cookiePrefix: string;
        signInPage: string;
        requireAdmin: boolean;
    }): NextAuthOptions => ({
        adapter: PrismaAdapter(prisma),
        providers: [
            GoogleProvider({
                clientId: process.env.GOOGLE_CLIENT_ID || "",
                clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
                allowDangerousEmailAccountLinking: true,
                authorization: {
                    params: {
                        prompt: "consent",
                        access_type: "offline",
                        response_type: "code"
                    }
                }
            }),
            FacebookProvider({
                clientId: process.env.FACEBOOK_CLIENT_ID || "",
                clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
            }),
            AppleProvider({
                clientId: process.env.APPLE_ID || "",
                clientSecret: process.env.APPLE_SECRET || "",
            }),
            CredentialsProvider({
                id: "otp",
                name: "OTP",
                credentials: {
                    identifier: { label: "Identifier", type: "text" },
                    password: { label: "Password", type: "password" },
                    otp: { label: "OTP", type: "text" }
                },
                async authorize(credentials: any) {
                    logToFile(`AUTH: Authorize called for ${credentials?.identifier}`);
                    if (!credentials?.identifier || !credentials?.otp) {
                        logToFile(`AUTH: Missing credentials`);
                        throw new Error("Missing credentials");
                    }

                    const { identifier, otp, password } = credentials;

                    // 1. Find User
                    const isEmail = identifier.includes('@');
                    let user;
                    if (isEmail) {
                        user = await prisma.user.findUnique({ where: { email: identifier } });
                    } else {
                        user = await prisma.user.findUnique({ where: { phoneNumber: identifier } });
                    }

                    if (!user) {
                        logToFile(`AUTH: User not found: ${identifier}`);
                        throw new Error("User not found. Please complete profile.");
                    }

                    if (user.deletedAt || user.status === "DEACTIVATED") {
                        logToFile(`AUTH: Blocked login for ${identifier}, status=${user.status}`);
                        throw new Error("Your account is deactivated. Contact support.");
                    }

                    if (requireAdmin && user.role !== 'ADMIN') {
                        logToFile(`AUTH: Non-admin attempted admin login: ${identifier}`);
                        throw new Error("Admin access only.");
                    }

                    // 2. Handle Admin Verification (Password + OTP)
                    if (user.role === 'ADMIN') {
                        if (!password) {
                            logToFile(`AUTH: Admin password missing for ${identifier}`);
                            throw new Error("Password is required for administrators.");
                        }

                        if (!user.hashedPassword) {
                            logToFile(`AUTH: Admin hashedPassword missing for ${identifier}`);
                            throw new Error("Administrative account is not properly configured. Please set a password.");
                        }

                        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
                        if (!isPasswordValid) {
                            logToFile(`AUTH: Admin password invalid for ${identifier}`);
                            throw new Error("Invalid password.");
                        }
                        logToFile(`AUTH: Admin password verified for ${identifier}`);
                    }

                    // 3. Verify OTP (Required for all flows now)
                    const verificationToken = await prisma.verificationToken.findUnique({
                        where: {
                            identifier_token: { identifier, token: otp }
                        }
                    });

                    if (!verificationToken) {
                        logToFile(`AUTH: Invalid OTP ${otp} for ${identifier}`);
                        throw new Error("Invalid OTP");
                    }

                    if (new Date() > verificationToken.expires) {
                        logToFile(`AUTH: OTP expired for ${identifier}`);
                        await prisma.verificationToken.delete({
                            where: { identifier_token: { identifier, token: otp } }
                        });
                        throw new Error("OTP Expired");
                    }

                    logToFile(`AUTH: Success for ${identifier}, role=${user.role}`);

                    // Delete OTP after successful verification
                    await prisma.verificationToken.delete({
                        where: { identifier_token: { identifier, token: otp } }
                    });

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role
                    };
                }
            })
        ],
        session: {
            strategy: "jwt",
        },
        pages: {
            signIn: signInPage,
        },
        cookies: {
            sessionToken: {
                name: `${cookiePrefix}.session-token`,
                options: {
                    httpOnly: true,
                    sameSite: "lax",
                    path: "/",
                    secure: process.env.NODE_ENV === "production",
                },
            },
            callbackUrl: {
                name: `${cookiePrefix}.callback-url`,
                options: {
                    sameSite: "lax",
                    path: "/",
                    secure: process.env.NODE_ENV === "production",
                },
            },
            csrfToken: {
                name: `${cookiePrefix}.csrf-token`,
                options: {
                    httpOnly: true,
                    sameSite: "lax",
                    path: "/",
                    secure: process.env.NODE_ENV === "production",
                },
            },
        },
        callbacks: {
            async signIn({ user, account }: any) {
                if (!user?.email) return true;
                const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
                // OAuth (Google etc.): allow new users through — the adapter creates them automatically.
                // Only block if the account already exists but is deactivated/deleted.
                if (account?.type === 'oauth') {
                    if (dbUser && (dbUser.deletedAt || dbUser.status === "DEACTIVATED")) {
                        return false;
                    }
                    return true;
                }
                // Credentials (OTP): user must already exist and be active.
                if (!dbUser || dbUser.deletedAt || dbUser.status === "DEACTIVATED") {
                    return false;
                }
                return true;
            },
            async jwt({ token, user }: any) {
                if (user) {
                    token.role = user.role;
                }
                return token;
            },
            async session({ session, token }: any) {
                if (session.user) {
                    (session.user as any).id = token.sub;
                    (session.user as any).role = token.role;
                }
                return session;
            },
        },
        debug: process.env.NODE_ENV === "development",
    });

    export const authOptions: NextAuthOptions = buildAuthOptions({
        cookiePrefix: "emm-user",
        signInPage: "/",
        requireAdmin: false,
    });

    export const adminAuthOptions: NextAuthOptions = buildAuthOptions({
        cookiePrefix: "emm-admin",
        signInPage: "/admin/login",
        requireAdmin: true,
    });
