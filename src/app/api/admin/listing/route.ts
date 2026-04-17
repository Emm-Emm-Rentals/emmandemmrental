import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { adminAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeDynamicPricingRules } from "@/lib/pricing";

// Create or update listing
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(adminAuthOptions);

        if (!session || (session.user as any).role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const {
            id,
            title,
            subtitle = null,
            description,
            category,
            price,
            roomCount,
            bathroomCount,
            guestCount,
            locationValue,
            imageSrc,
            images = [],
            amenities = [],
            rules = [],
            sleepingArrangements = [],
            mapIframe = null,
            highlights = [],
            houseRules = [],
            checkInTime = "3:00 PM",
            checkOutTime = "11:00 AM",
            hostDescription = null,
            basePricePerNight = null,
            cleaningFee = null,
            serviceFee = null,
            petFee = null,
            taxPercentage = 10,
            taxProfileId = null,
            minStayNights = 1,
            dynamicPricingRules = [],
            maxGuestsAllowed = null,
            instantBook = false,
            comingSoon = false,
            cancellationPolicy = null,
            lodgifyPropertyId = null,
            lodgifyRoomTypeId = null,
            lodgifyBookingUrl = null,
            lodgifyWidgetEmbed = null,
            specifications = [],
            advantages = [],
            bedrooms = [],
            gallerySections = [],
        } = body;

        // Convert string values to proper types
        const parsedPrice = price ? parseInt(String(price), 10) : 0;
        const parsedRoomCount = roomCount ? parseInt(String(roomCount), 10) : 0;
        const parsedBathroomCount = bathroomCount ? parseInt(String(bathroomCount), 10) : 0;
        const parsedGuestCount = guestCount ? parseInt(String(guestCount), 10) : 0;
        const parsedBasePricePerNight = basePricePerNight ? parseInt(String(basePricePerNight), 10) : null;
        const parsedCleaningFee = cleaningFee ? parseInt(String(cleaningFee), 10) : null;
        const parsedServiceFee = serviceFee ? parseInt(String(serviceFee), 10) : null;
        const parsedPetFee = petFee ? parseInt(String(petFee), 10) : null;
        const parsedTaxPercentage = taxPercentage ? parseInt(String(taxPercentage), 10) : 10;
        const parsedMinStayNights = minStayNights ? parseInt(String(minStayNights), 10) : 1;
        const parsedDynamicPricingRules = normalizeDynamicPricingRules(dynamicPricingRules);
        const parsedMaxGuestsAllowed = maxGuestsAllowed ? parseInt(String(maxGuestsAllowed), 10) : null;
        const parsedTaxProfileId = typeof taxProfileId === "string" && taxProfileId.trim() ? taxProfileId.trim() : null;
        const parsedLodgifyPropertyId = typeof lodgifyPropertyId === "string" && lodgifyPropertyId.trim() ? lodgifyPropertyId.trim() : null;
        const parsedLodgifyRoomTypeId = typeof lodgifyRoomTypeId === "string" && lodgifyRoomTypeId.trim() ? lodgifyRoomTypeId.trim() : null;
        const parsedLodgifyBookingUrl = typeof lodgifyBookingUrl === "string" && lodgifyBookingUrl.trim() ? lodgifyBookingUrl.trim() : null;
        const parsedLodgifyWidgetEmbed = typeof lodgifyWidgetEmbed === "string" && lodgifyWidgetEmbed.trim() ? lodgifyWidgetEmbed.trim() : null;

        if (parsedTaxProfileId) {
            const profileExists = await prisma.taxProfile.findUnique({
                where: { id: parsedTaxProfileId },
                select: { id: true },
            });
            if (!profileExists) {
                return NextResponse.json(
                    { error: "Invalid tax profile selected" },
                    { status: 400 }
                );
            }
        }

        if (!title || !description || !locationValue || !category) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (parsedBasePricePerNight !== null && parsedBasePricePerNight > 100000) {
            return NextResponse.json(
                { error: "Base Price / Night looks too high. Please enter the nightly rate in normal currency units, not cents." },
                { status: 400 }
            );
        }

        const oversizedDynamicRule = parsedDynamicPricingRules.find((rule) => rule.nightlyPrice > 100000);
        if (oversizedDynamicRule) {
            return NextResponse.json(
                { error: `Dynamic pricing rule \"${oversizedDynamicRule.label}\" looks too high. Please enter nightly prices in normal currency units, not cents.` },
                { status: 400 }
            );
        }

        const taxProfileRelation = parsedTaxProfileId
            ? { connect: { id: parsedTaxProfileId } }
            : { disconnect: true };

        if (id && id !== "new") {
            // Update existing listing - first verify it exists
            const existingListing = await prisma.listing.findUnique({
                where: { id },
            });

            if (!existingListing) {
                return NextResponse.json(
                    { error: `Listing with ID ${id} not found` },
                    { status: 404 }
                );
            }

            // Update existing listing
            const listing = await prisma.listing.update({
                where: { id },
                data: {
                    title,
                    ...(subtitle && { subtitle }),
                    description,
                    category,
                    price: parsedPrice,
                    roomCount: parsedRoomCount,
                    bathroomCount: parsedBathroomCount,
                    guestCount: parsedGuestCount,
                    locationValue,
                    ...(imageSrc && { imageSrc }),
                    amenities,
                    rules,
                    sleepingArrangements,
                    ...(mapIframe && { mapIframe }),
                    highlights,
                    houseRules,
                    checkInTime,
                    checkOutTime,
                    ...(hostDescription && { hostDescription }),
                    ...(parsedBasePricePerNight && { basePricePerNight: parsedBasePricePerNight }),
                    ...(parsedCleaningFee && { cleaningFee: parsedCleaningFee }),
                    ...(parsedServiceFee && { serviceFee: parsedServiceFee }),
                    ...(parsedPetFee !== null && { petFee: parsedPetFee }),
                    taxPercentage: parsedTaxPercentage,
                    taxProfile: taxProfileRelation,
                    minStayNights: parsedMinStayNights,
                    dynamicPricingRules: parsedDynamicPricingRules as any,
                    ...(parsedMaxGuestsAllowed && { maxGuestsAllowed: parsedMaxGuestsAllowed }),
                    instantBook,
                    comingSoon,
                    ...(cancellationPolicy && { cancellationPolicy }),
                    lodgifyPropertyId: parsedLodgifyPropertyId,
                    lodgifyRoomTypeId: parsedLodgifyRoomTypeId,
                    lodgifyBookingUrl: parsedLodgifyBookingUrl,
                    lodgifyWidgetEmbed: parsedLodgifyWidgetEmbed,
                },
                include: {
                    images: true,
                    specifications: true,
                    advantages: true,
                    bedrooms: true,
                    gallerySections: {
                        include: {
                            images: {
                                orderBy: { order: "asc" },
                            },
                        },
                        orderBy: { order: "asc" },
                    },
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                    taxProfile: {
                        include: {
                            lines: {
                                orderBy: { order: "asc" },
                            },
                        },
                    },
                },
            });

            // Update images if provided
            if (images.length > 0) {
                // Delete old images
                await prisma.listingImage.deleteMany({
                    where: { listingId: id },
                });

                // Create new images
                await prisma.listingImage.createMany({
                    data: images.map((url: string, index: number) => ({
                        listingId: id,
                        imageUrl: url,
                        order: index,
                    })),
                });
            }

            // Update specifications if provided
            if (specifications.length >= 0) {
                // Delete old specifications
                await prisma.listingSpecification.deleteMany({
                    where: { listingId: id },
                });

                // Create new specifications
                if (specifications.length > 0) {
                    await prisma.listingSpecification.createMany({
                        data: specifications.map((spec: any, index: number) => ({
                            listingId: id,
                            title: spec.title,
                            description: spec.description,
                            order: index,
                        })),
                    });
                }
            }

            // Update advantages if provided
            if (advantages.length >= 0) {
                // Delete old advantages
                await prisma.listingAdvantage.deleteMany({
                    where: { listingId: id },
                });

                // Create new advantages
                if (advantages.length > 0) {
                    await prisma.listingAdvantage.createMany({
                        data: advantages.map((adv: any, index: number) => ({
                            listingId: id,
                            title: adv.title,
                            description: adv.description,
                            iconUrl: adv.iconUrl || undefined,
                            order: index,
                        })),
                    });
                }
            }

            // Update bedrooms if provided
            if (bedrooms.length >= 0) {
                // Delete old bedrooms
                await prisma.listingBedroom.deleteMany({
                    where: { listingId: id },
                });

                // Create new bedrooms
                if (bedrooms.length > 0) {
                    await prisma.listingBedroom.createMany({
                        data: bedrooms.map((bed: any, index: number) => ({
                            listingId: id,
                            name: bed.name,
                            type: bed.type,
                            description: bed.description,
                            imageUrl: bed.imageUrl || undefined,
                            order: index,
                        })),
                    });
                }
            }

            // Update gallery sections if provided
            if (gallerySections.length >= 0) {
                await prisma.listingGallerySection.deleteMany({
                    where: { listingId: id },
                });

                if (gallerySections.length > 0) {
                    await Promise.all(
                        gallerySections.map((section: any, sectionIndex: number) =>
                            prisma.listingGallerySection.create({
                                data: {
                                    listingId: id,
                                    title: section.title || `Section ${sectionIndex + 1}`,
                                    order: sectionIndex,
                                    images: {
                                        create: (section.images || []).map((url: string, imageIndex: number) => ({
                                            imageUrl: url,
                                            order: imageIndex,
                                        })),
                                    },
                                },
                            })
                        )
                    );
                }
            }

            // Refetch with all relationships
            return NextResponse.json(
                await prisma.listing.findUnique({
                    where: { id },
                    include: {
                        images: {
                            orderBy: { order: "asc" },
                        },
                        specifications: {
                            orderBy: { order: "asc" },
                        },
                        advantages: {
                            orderBy: { order: "asc" },
                        },
                        bedrooms: {
                            orderBy: { order: "asc" },
                        },
                        gallerySections: {
                            include: {
                                images: {
                                    orderBy: { order: "asc" },
                                },
                            },
                            orderBy: { order: "asc" },
                        },
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                        taxProfile: {
                            include: {
                                lines: {
                                    orderBy: { order: "asc" },
                                },
                            },
                        },
                    },
                })
            );
        } else {
            // Create new listing - use current logged-in user
            const currentUserId = (session.user as any).id;
            
            if (!currentUserId) {
                return NextResponse.json(
                    { error: "User ID not found in session" },
                    { status: 400 }
                );
            }

            const orderAggregate = await prisma.listing.aggregate({
                _max: { displayOrder: true },
            });
            const nextDisplayOrder = (orderAggregate._max.displayOrder ?? -1) + 1;

            const listing = await prisma.listing.create({
                data: {
                    title,
                    ...(subtitle && { subtitle }),
                    description,
                    category,
                    price: parsedPrice,
                    roomCount: parsedRoomCount,
                    bathroomCount: parsedBathroomCount,
                    guestCount: parsedGuestCount,
                    locationValue,
                    displayOrder: nextDisplayOrder,
                    userId: currentUserId,
                    imageSrc: imageSrc || images[0] || "/default-listing.jpg",
                    amenities,
                    rules,
                    sleepingArrangements,
                    ...(mapIframe && { mapIframe }),
                    highlights,
                    houseRules,
                    checkInTime,
                    checkOutTime,
                    ...(hostDescription && { hostDescription }),
                    ...(parsedBasePricePerNight && { basePricePerNight: parsedBasePricePerNight }),
                    ...(parsedCleaningFee && { cleaningFee: parsedCleaningFee }),
                    ...(parsedServiceFee && { serviceFee: parsedServiceFee }),
                    ...(parsedPetFee !== null && { petFee: parsedPetFee }),
                    taxPercentage: parsedTaxPercentage,
                    ...(parsedTaxProfileId
                        ? { taxProfile: { connect: { id: parsedTaxProfileId } } }
                        : {}),
                    minStayNights: parsedMinStayNights,
                    dynamicPricingRules: parsedDynamicPricingRules as any,
                    ...(parsedMaxGuestsAllowed && { maxGuestsAllowed: parsedMaxGuestsAllowed }),
                    instantBook,
                    comingSoon,
                    ...(cancellationPolicy && { cancellationPolicy }),
                    lodgifyPropertyId: parsedLodgifyPropertyId,
                    lodgifyRoomTypeId: parsedLodgifyRoomTypeId,
                    lodgifyBookingUrl: parsedLodgifyBookingUrl,
                    lodgifyWidgetEmbed: parsedLodgifyWidgetEmbed,
                    images: {
                        create: images.map((url: string, index: number) => ({
                            imageUrl: url,
                            order: index,
                        })),
                    },
                    specifications: {
                        create: specifications.map((spec: any, index: number) => ({
                            title: spec.title,
                            description: spec.description,
                            order: index,
                        })),
                    },
                    advantages: {
                        create: advantages.map((adv: any, index: number) => ({
                            title: adv.title,
                            description: adv.description,
                            iconUrl: adv.iconUrl || undefined,
                            order: index,
                        })),
                    },
                    bedrooms: {
                        create: bedrooms.map((bed: any, index: number) => ({
                            name: bed.name,
                            type: bed.type,
                            description: bed.description,
                            imageUrl: bed.imageUrl || undefined,
                            order: index,
                        })),
                    },
                    gallerySections: {
                        create: gallerySections.map((section: any, sectionIndex: number) => ({
                            title: section.title || `Section ${sectionIndex + 1}`,
                            order: sectionIndex,
                            images: {
                                create: (section.images || []).map((url: string, imageIndex: number) => ({
                                    imageUrl: url,
                                    order: imageIndex,
                                })),
                            },
                        })),
                    },
                },
                include: {
                    images: true,
                    specifications: true,
                    advantages: true,
                    bedrooms: true,
                    gallerySections: {
                        include: {
                            images: {
                                orderBy: { order: "asc" },
                            },
                        },
                        orderBy: { order: "asc" },
                    },
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                    taxProfile: {
                        include: {
                            lines: {
                                orderBy: { order: "asc" },
                            },
                        },
                    },
                },
            });

            return NextResponse.json(listing, { status: 201 });
        }
    } catch (error) {
        console.error("Listing error:", error);
        return NextResponse.json(
            { error: "Failed to save listing" },
            { status: 500 }
        );
    }
}

// Get single listing
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(adminAuthOptions);

        if (!session || (session.user as any).role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const id = request.nextUrl.searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Listing ID is required" },
                { status: 400 }
            );
        }

        const listing = await prisma.listing.findUnique({
            where: { id },
            include: {
                images: {
                    orderBy: { order: "asc" },
                },
                specifications: {
                    orderBy: { order: "asc" },
                },
                advantages: {
                    orderBy: { order: "asc" },
                },
                bedrooms: {
                    orderBy: { order: "asc" },
                },
                gallerySections: {
                    include: {
                        images: {
                            orderBy: { order: "asc" },
                        },
                    },
                    orderBy: { order: "asc" },
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                taxProfile: {
                    include: {
                        lines: {
                            orderBy: { order: "asc" },
                        },
                    },
                },
            },
        });

        if (!listing) {
            return NextResponse.json(
                { error: "Listing not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(listing);
    } catch (error) {
        console.error("Get listing error:", error);
        return NextResponse.json(
            { error: "Failed to fetch listing" },
            { status: 500 }
        );
    }
}
