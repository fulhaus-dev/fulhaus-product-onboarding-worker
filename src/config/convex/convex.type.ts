import { anyApi, type FunctionReference } from "convex/server";
import type { GenericId as Id } from "convex/values";

export const api: PublicApiType = anyApi as unknown as PublicApiType;
export const internal: InternalApiType = anyApi as unknown as InternalApiType;

export type PublicApiType = {
	v1: {
		auth: {
			mutation: {
				sendAuthOtp: FunctionReference<"mutation", "public", { email: string }, any>;
				signInWithOtp: FunctionReference<"mutation", "public", { email: string; otp: string }, any>;
				refreshAuthSession: FunctionReference<
					"mutation",
					"public",
					{ sessionId: Id<"sessions"> },
					any
				>;
				logout: FunctionReference<"mutation", "public", any, any>;
			};
		};
		cart: {
			mutation: {
				saveCartItem: FunctionReference<
					"mutation",
					"public",
					{
						data: Array<{
							designId: Id<"designs">;
							productId: Id<"products">;
							quantity: number;
						}>;
						workspaceId: Id<"workspaces">;
					},
					any
				>;
				updateCartItem: FunctionReference<
					"mutation",
					"public",
					{
						cartItemId: Id<"cartItems">;
						updates: { productId?: Id<"products">; quantity?: number };
						workspaceId: Id<"workspaces">;
					},
					any
				>;
				deleteCartItem: FunctionReference<
					"mutation",
					"public",
					{ cartItemId: Id<"cartItems">; workspaceId: Id<"workspaces"> },
					any
				>;
			};
			query: {
				getCartByWorkspaceId: FunctionReference<
					"query",
					"public",
					{ currencyCode: "USD" | "CAD"; workspaceId: Id<"workspaces"> },
					any
				>;
				getCartByDesignId: FunctionReference<
					"query",
					"public",
					{
						currencyCode: "USD" | "CAD";
						designId: Id<"designs">;
						workspaceId: Id<"workspaces">;
					},
					any
				>;
			};
		};
		chat: {
			mutation: {
				createChat: FunctionReference<"mutation", "public", { workspaceId: Id<"workspaces"> }, any>;
			};
			query: {
				getChatUiMessagesAndUsers: FunctionReference<
					"query",
					"public",
					{ chatId: Id<"chats">; workspaceId: Id<"workspaces"> },
					any
				>;
			};
		};
		design: {
			mutation: {
				updateDesignById: FunctionReference<
					"mutation",
					"public",
					{
						designId: Id<"designs">;
						updates: {
							description?: string;
							floorPlanFile?: { mediaType: string; url: string };
							floorPlanUrl?: string;
							generateRender?: boolean;
							generatingFurnitureRecommendation?: boolean;
							inspirationImageUrl?: string;
							name?: string;
							productCategories?: Array<{
								category:
									| "Arm Chair"
									| "Artwork"
									| "Baking Dish"
									| "Bar Cart"
									| "Bar Stool"
									| "Bar Table"
									| "Bath Linens"
									| "Bathroom Accessory"
									| "Ornament"
									| "Bathtub"
									| "Bed"
									| "Bedding"
									| "Bedroom Vanity"
									| "Bench"
									| "Blind"
									| "Bookcase"
									| "Cabinet"
									| "Carpet"
									| "Ceiling Lamp"
									| "Ceiling Mirror"
									| "Chaise Lounge"
									| "Chest"
									| "Coat Rack"
									| "Coffee Table"
									| "Console Table"
									| "Cookware"
									| "Counter"
									| "Counter Stool"
									| "Crib"
									| "Crib Mattress"
									| "Crib Bed"
									| "Crib Bedding"
									| "Curtain"
									| "Desk"
									| "Desk Chair"
									| "Dining Chair"
									| "Dining Table"
									| "Dinnerware"
									| "Dresser"
									| "Entry Hook"
									| "Floor Lamp"
									| "Kettle"
									| "King Mattress"
									| "Kitchen Accessory"
									| "LED Light"
									| "Loveseat"
									| "Nightstand"
									| "Ottoman"
									| "Pendant Light"
									| "Pillow"
									| "Plant"
									| "Planter"
									| "Artificial Plant"
									| "Queen Mattress"
									| "Rack"
									| "Rug"
									| "Sconce"
									| "Sculpture"
									| "Sectional"
									| "Shelf"
									| "Shelving Unit"
									| "Shower Curtain"
									| "Side Table"
									| "Sideboard"
									| "Sofa"
									| "Sofa Bed"
									| "Standing Mirror"
									| "Stands"
									| "Storage Cabinet"
									| "Table Lamp"
									| "Tablecloth"
									| "Throw Blanket"
									| "Throw Pillow"
									| "TV Media Console"
									| "Twin Mattress"
									| "Vanity"
									| "Vanity Light"
									| "Wall Mirror"
									| "Wardrobe"
									| "Waste basket"
									| "Outdoor Arm Chair"
									| "Outdoor Rug"
									| "Outdoor Dining Chair"
									| "Outdoor Chair"
									| "Outdoor Coffee Table"
									| "Outdoor Dining Table"
									| "Outdoor Fire Pit"
									| "Outdoor Lounger"
									| "Outdoor Side Table"
									| "Outdoor Sofa"
									| "Outdoor Throw Pillow"
									| "Outdoor Umbrella"
									| "Outdoor Light"
									| "Outdoor Lantern"
									| "Outdoor Table"
									| "Outdoor Table Lamp"
									| "Outdoor LED Light"
									| "Outdoor Ceiling Lamp";
								filter?: {
									maxDepth?: number;
									maxHeight?: number;
									maxPrice?: number;
									maxWidth?: number;
									minDepth?: number;
									minHeight?: number;
									minPrice?: number;
									minWidth?: number;
								};
							}>;
							productIds?: Array<Id<"products">>;
							renderedImageUrl?: string;
							renderingImage?: boolean;
							spaceType?:
								| "Attic"
								| "Basement"
								| "Bathroom"
								| "Bedroom"
								| "Classroom"
								| "Dining Room"
								| "Entryway"
								| "Event Space"
								| "Exercise Room"
								| "Kitchen"
								| "Laundry Room"
								| "Library"
								| "Living Room"
								| "Lobby"
								| "Locker Room"
								| "Lounge"
								| "Media Room"
								| "Medical Room"
								| "Meeting Room"
								| "Mudroom"
								| "Office"
								| "Outdoor Space"
								| "Spa"
								| "Walk-in Closet";
						};
						workspaceId: Id<"workspaces">;
					},
					any
				>;
				addNewProductToDesignById: FunctionReference<
					"mutation",
					"public",
					{
						designId: Id<"designs">;
						update: {
							productCategory: {
								category:
									| "Arm Chair"
									| "Artwork"
									| "Baking Dish"
									| "Bar Cart"
									| "Bar Stool"
									| "Bar Table"
									| "Bath Linens"
									| "Bathroom Accessory"
									| "Ornament"
									| "Bathtub"
									| "Bed"
									| "Bedding"
									| "Bedroom Vanity"
									| "Bench"
									| "Blind"
									| "Bookcase"
									| "Cabinet"
									| "Carpet"
									| "Ceiling Lamp"
									| "Ceiling Mirror"
									| "Chaise Lounge"
									| "Chest"
									| "Coat Rack"
									| "Coffee Table"
									| "Console Table"
									| "Cookware"
									| "Counter"
									| "Counter Stool"
									| "Crib"
									| "Crib Mattress"
									| "Crib Bed"
									| "Crib Bedding"
									| "Curtain"
									| "Desk"
									| "Desk Chair"
									| "Dining Chair"
									| "Dining Table"
									| "Dinnerware"
									| "Dresser"
									| "Entry Hook"
									| "Floor Lamp"
									| "Kettle"
									| "King Mattress"
									| "Kitchen Accessory"
									| "LED Light"
									| "Loveseat"
									| "Nightstand"
									| "Ottoman"
									| "Pendant Light"
									| "Pillow"
									| "Plant"
									| "Planter"
									| "Artificial Plant"
									| "Queen Mattress"
									| "Rack"
									| "Rug"
									| "Sconce"
									| "Sculpture"
									| "Sectional"
									| "Shelf"
									| "Shelving Unit"
									| "Shower Curtain"
									| "Side Table"
									| "Sideboard"
									| "Sofa"
									| "Sofa Bed"
									| "Standing Mirror"
									| "Stands"
									| "Storage Cabinet"
									| "Table Lamp"
									| "Tablecloth"
									| "Throw Blanket"
									| "Throw Pillow"
									| "TV Media Console"
									| "Twin Mattress"
									| "Vanity"
									| "Vanity Light"
									| "Wall Mirror"
									| "Wardrobe"
									| "Waste basket"
									| "Outdoor Arm Chair"
									| "Outdoor Rug"
									| "Outdoor Dining Chair"
									| "Outdoor Chair"
									| "Outdoor Coffee Table"
									| "Outdoor Dining Table"
									| "Outdoor Fire Pit"
									| "Outdoor Lounger"
									| "Outdoor Side Table"
									| "Outdoor Sofa"
									| "Outdoor Throw Pillow"
									| "Outdoor Umbrella"
									| "Outdoor Light"
									| "Outdoor Lantern"
									| "Outdoor Table"
									| "Outdoor Table Lamp"
									| "Outdoor LED Light"
									| "Outdoor Ceiling Lamp";
								filter?: {
									maxDepth?: number;
									maxHeight?: number;
									maxPrice?: number;
									maxWidth?: number;
									minDepth?: number;
									minHeight?: number;
									minPrice?: number;
									minWidth?: number;
								};
							};
							productId: Id<"products">;
						};
						workspaceId: Id<"workspaces">;
					},
					any
				>;
				removeProductFromDesignById: FunctionReference<
					"mutation",
					"public",
					{
						designId: Id<"designs">;
						remove: {
							productCategory: {
								category:
									| "Arm Chair"
									| "Artwork"
									| "Baking Dish"
									| "Bar Cart"
									| "Bar Stool"
									| "Bar Table"
									| "Bath Linens"
									| "Bathroom Accessory"
									| "Ornament"
									| "Bathtub"
									| "Bed"
									| "Bedding"
									| "Bedroom Vanity"
									| "Bench"
									| "Blind"
									| "Bookcase"
									| "Cabinet"
									| "Carpet"
									| "Ceiling Lamp"
									| "Ceiling Mirror"
									| "Chaise Lounge"
									| "Chest"
									| "Coat Rack"
									| "Coffee Table"
									| "Console Table"
									| "Cookware"
									| "Counter"
									| "Counter Stool"
									| "Crib"
									| "Crib Mattress"
									| "Crib Bed"
									| "Crib Bedding"
									| "Curtain"
									| "Desk"
									| "Desk Chair"
									| "Dining Chair"
									| "Dining Table"
									| "Dinnerware"
									| "Dresser"
									| "Entry Hook"
									| "Floor Lamp"
									| "Kettle"
									| "King Mattress"
									| "Kitchen Accessory"
									| "LED Light"
									| "Loveseat"
									| "Nightstand"
									| "Ottoman"
									| "Pendant Light"
									| "Pillow"
									| "Plant"
									| "Planter"
									| "Artificial Plant"
									| "Queen Mattress"
									| "Rack"
									| "Rug"
									| "Sconce"
									| "Sculpture"
									| "Sectional"
									| "Shelf"
									| "Shelving Unit"
									| "Shower Curtain"
									| "Side Table"
									| "Sideboard"
									| "Sofa"
									| "Sofa Bed"
									| "Standing Mirror"
									| "Stands"
									| "Storage Cabinet"
									| "Table Lamp"
									| "Tablecloth"
									| "Throw Blanket"
									| "Throw Pillow"
									| "TV Media Console"
									| "Twin Mattress"
									| "Vanity"
									| "Vanity Light"
									| "Wall Mirror"
									| "Wardrobe"
									| "Waste basket"
									| "Outdoor Arm Chair"
									| "Outdoor Rug"
									| "Outdoor Dining Chair"
									| "Outdoor Chair"
									| "Outdoor Coffee Table"
									| "Outdoor Dining Table"
									| "Outdoor Fire Pit"
									| "Outdoor Lounger"
									| "Outdoor Side Table"
									| "Outdoor Sofa"
									| "Outdoor Throw Pillow"
									| "Outdoor Umbrella"
									| "Outdoor Light"
									| "Outdoor Lantern"
									| "Outdoor Table"
									| "Outdoor Table Lamp"
									| "Outdoor LED Light"
									| "Outdoor Ceiling Lamp";
								filter?: {
									maxDepth?: number;
									maxHeight?: number;
									maxPrice?: number;
									maxWidth?: number;
									minDepth?: number;
									minHeight?: number;
									minPrice?: number;
									minWidth?: number;
								};
							};
							productId: Id<"products">;
						};
						workspaceId: Id<"workspaces">;
					},
					any
				>;
			};
			query: {
				getDesignDataByChatId: FunctionReference<
					"query",
					"public",
					{ chatId: Id<"chats">; currencyCode: "USD" | "CAD" },
					any
				>;
				getDesignsByWorkspaceId: FunctionReference<
					"query",
					"public",
					{ workspaceId: Id<"workspaces"> },
					any
				>;
				getUniqueDesignSpacesForWorkspace: FunctionReference<
					"query",
					"public",
					{ workspaceId: Id<"workspaces"> },
					any
				>;
			};
			tag: {
				mutation: {
					saveDesignTags: FunctionReference<
						"mutation",
						"public",
						{
							designId: Id<"designs">;
							tagNames: Array<string>;
							workspaceId: Id<"workspaces">;
						},
						any
					>;
					deleteDesignTag: FunctionReference<
						"mutation",
						"public",
						{ designTagId: Id<"designTags">; workspaceId: Id<"workspaces"> },
						any
					>;
				};
				query: {
					getDesignTagsForWorkspace: FunctionReference<
						"query",
						"public",
						{ workspaceId: Id<"workspaces"> },
						any
					>;
				};
			};
		};
		payment: {
			action: {
				getCartPaymentCheckoutUrl: FunctionReference<
					"action",
					"public",
					{
						currencyCode: "USD" | "CAD";
						successUrl: string;
						workspaceId: Id<"workspaces">;
					},
					any
				>;
			};
		};
		product: {
			mutation: {
				createPoProducts: FunctionReference<
					"mutation",
					"public",
					{
						data: Array<{
							imageEmbedding: Array<number>;
							productData: {
								brand?: string;
								category:
									| "Arm Chair"
									| "Artwork"
									| "Baking Dish"
									| "Bar Cart"
									| "Bar Stool"
									| "Bar Table"
									| "Bath Linens"
									| "Bathroom Accessory"
									| "Ornament"
									| "Bathtub"
									| "Bed"
									| "Bedding"
									| "Bedroom Vanity"
									| "Bench"
									| "Blind"
									| "Bookcase"
									| "Cabinet"
									| "Carpet"
									| "Ceiling Lamp"
									| "Ceiling Mirror"
									| "Chaise Lounge"
									| "Chest"
									| "Coat Rack"
									| "Coffee Table"
									| "Console Table"
									| "Cookware"
									| "Counter"
									| "Counter Stool"
									| "Crib"
									| "Crib Mattress"
									| "Crib Bed"
									| "Crib Bedding"
									| "Curtain"
									| "Desk"
									| "Desk Chair"
									| "Dining Chair"
									| "Dining Table"
									| "Dinnerware"
									| "Dresser"
									| "Entry Hook"
									| "Floor Lamp"
									| "Kettle"
									| "King Mattress"
									| "Kitchen Accessory"
									| "LED Light"
									| "Loveseat"
									| "Nightstand"
									| "Ottoman"
									| "Pendant Light"
									| "Pillow"
									| "Plant"
									| "Planter"
									| "Artificial Plant"
									| "Queen Mattress"
									| "Rack"
									| "Rug"
									| "Sconce"
									| "Sculpture"
									| "Sectional"
									| "Shelf"
									| "Shelving Unit"
									| "Shower Curtain"
									| "Side Table"
									| "Sideboard"
									| "Sofa"
									| "Sofa Bed"
									| "Standing Mirror"
									| "Stands"
									| "Storage Cabinet"
									| "Table Lamp"
									| "Tablecloth"
									| "Throw Blanket"
									| "Throw Pillow"
									| "TV Media Console"
									| "Twin Mattress"
									| "Vanity"
									| "Vanity Light"
									| "Wall Mirror"
									| "Wardrobe"
									| "Waste basket"
									| "Outdoor Arm Chair"
									| "Outdoor Rug"
									| "Outdoor Dining Chair"
									| "Outdoor Chair"
									| "Outdoor Coffee Table"
									| "Outdoor Dining Table"
									| "Outdoor Fire Pit"
									| "Outdoor Lounger"
									| "Outdoor Side Table"
									| "Outdoor Sofa"
									| "Outdoor Throw Pillow"
									| "Outdoor Umbrella"
									| "Outdoor Light"
									| "Outdoor Lantern"
									| "Outdoor Table"
									| "Outdoor Table Lamp"
									| "Outdoor LED Light"
									| "Outdoor Ceiling Lamp";
								colorNames: Array<string>;
								depth: number;
								description: string;
								dimension?: string;
								dimensionUnit: "in";
								fhSku: string;
								gtin?: string;
								hasCAD?: boolean;
								hasUSD?: boolean;
								height: number;
								hexColors: Array<string>;
								imageUrls: Array<string>;
								itemId?: string;
								mainImageNoBgUrl?: string;
								mainImageUrl: string;
								materials: Array<string>;
								mpn?: string;
								name: string;
								ownerId?: Id<"workspaces">;
								pdpLink?: string;
								prices: Array<{
									currencyCode: "USD" | "CAD";
									map?: number;
									msrp?: number;
									retailPrice: number;
									shippingPrice?: number;
									tradePrice: number;
								}>;
								restockDateCAD?: number;
								restockDateUSD?: number;
								retailPriceCAD?: number;
								retailPriceUSD?: number;
								shippingDepth: number;
								shippingDimension: string;
								shippingHeight: number;
								shippingWeight: number;
								shippingWidth: number;
								sku: string;
								stockQtyCAD: number;
								stockQtyUSD: number;
								styles: Array<
									| "Art Deco"
									| "Biophilic"
									| "Bohemian"
									| "Brutalism"
									| "Coastal"
									| "Colonial"
									| "Contemporary"
									| "Craftsman"
									| "Eclectic"
									| "French Country"
									| "Hollywood Glamour"
									| "Industrial"
									| "Japandi"
									| "Luxury"
									| "Maximalist"
									| "Mediterranean"
									| "Mid-Century Modern"
									| "Minimalist"
									| "Modern"
									| "Modern Farmhouse"
									| "Neoclassical"
									| "Neutral"
									| "Rustic"
									| "Scandinavian"
									| "Shabby Chic"
									| "Southwestern"
									| "Traditional"
									| "Transitional"
									| "Tudor"
									| "Victorian"
									| "Vintage"
								>;
								unitPerBox: number;
								vendorId: Id<"productVendors">;
								weight: number;
								weightUnit: "lb";
								width: number;
							};
						}>;
						poApiKey: string;
					},
					Array<Id<"products">>
				>;
				updatePoProductsById: FunctionReference<
					"mutation",
					"public",
					{
						data: Array<{
							productId: Id<"products">;
							updates: {
								hasCAD?: boolean;
								hasUSD?: boolean;
								prices?: Array<{
									currencyCode: "USD" | "CAD";
									map?: number;
									msrp?: number;
									retailPrice: number;
									shippingPrice?: number;
									tradePrice: number;
								}>;
								restockDate?: number;
								retailPriceCAD?: number;
								retailPriceUSD?: number;
								status?: "Active" | "Inactive" | "Discontinued";
								stockDate?: number;
								stockQty?: number;
							};
						}>;
						poApiKey: string;
					},
					null
				>;
			};
			query: {
				getPoProductsBySkus: FunctionReference<
					"query",
					"public",
					{ poApiKey: string; skus: Array<string> },
					Array<{
						_creationTime: number;
						_id: Id<"products">;
						brand?: string;
						category:
							| "Arm Chair"
							| "Artwork"
							| "Baking Dish"
							| "Bar Cart"
							| "Bar Stool"
							| "Bar Table"
							| "Bath Linens"
							| "Bathroom Accessory"
							| "Ornament"
							| "Bathtub"
							| "Bed"
							| "Bedding"
							| "Bedroom Vanity"
							| "Bench"
							| "Blind"
							| "Bookcase"
							| "Cabinet"
							| "Carpet"
							| "Ceiling Lamp"
							| "Ceiling Mirror"
							| "Chaise Lounge"
							| "Chest"
							| "Coat Rack"
							| "Coffee Table"
							| "Console Table"
							| "Cookware"
							| "Counter"
							| "Counter Stool"
							| "Crib"
							| "Crib Mattress"
							| "Crib Bed"
							| "Crib Bedding"
							| "Curtain"
							| "Desk"
							| "Desk Chair"
							| "Dining Chair"
							| "Dining Table"
							| "Dinnerware"
							| "Dresser"
							| "Entry Hook"
							| "Floor Lamp"
							| "Kettle"
							| "King Mattress"
							| "Kitchen Accessory"
							| "LED Light"
							| "Loveseat"
							| "Nightstand"
							| "Ottoman"
							| "Pendant Light"
							| "Pillow"
							| "Plant"
							| "Planter"
							| "Artificial Plant"
							| "Queen Mattress"
							| "Rack"
							| "Rug"
							| "Sconce"
							| "Sculpture"
							| "Sectional"
							| "Shelf"
							| "Shelving Unit"
							| "Shower Curtain"
							| "Side Table"
							| "Sideboard"
							| "Sofa"
							| "Sofa Bed"
							| "Standing Mirror"
							| "Stands"
							| "Storage Cabinet"
							| "Table Lamp"
							| "Tablecloth"
							| "Throw Blanket"
							| "Throw Pillow"
							| "TV Media Console"
							| "Twin Mattress"
							| "Vanity"
							| "Vanity Light"
							| "Wall Mirror"
							| "Wardrobe"
							| "Waste basket"
							| "Outdoor Arm Chair"
							| "Outdoor Rug"
							| "Outdoor Dining Chair"
							| "Outdoor Chair"
							| "Outdoor Coffee Table"
							| "Outdoor Dining Table"
							| "Outdoor Fire Pit"
							| "Outdoor Lounger"
							| "Outdoor Side Table"
							| "Outdoor Sofa"
							| "Outdoor Throw Pillow"
							| "Outdoor Umbrella"
							| "Outdoor Light"
							| "Outdoor Lantern"
							| "Outdoor Table"
							| "Outdoor Table Lamp"
							| "Outdoor LED Light"
							| "Outdoor Ceiling Lamp";
						colorNames: Array<string>;
						depth: number;
						description: string;
						dimension?: string;
						dimensionUnit: "in";
						embeddingId: Id<"productEmbeddings">;
						fhSku: string;
						fullTextSearch: string;
						gtin?: string;
						hasCAD?: boolean;
						hasUSD?: boolean;
						height: number;
						hexColors: Array<string>;
						imageUrls: Array<string>;
						itemId?: string;
						mainImageNoBgUrl?: string;
						mainImageUrl: string;
						materials: Array<string>;
						mpn?: string;
						name: string;
						ownerId?: Id<"workspaces">;
						pdpLink?: string;
						prices: Array<{
							currencyCode: "USD" | "CAD";
							map?: number;
							msrp?: number;
							retailPrice: number;
							shippingPrice?: number;
							tradePrice: number;
						}>;
						restockDateCAD?: number;
						restockDateUSD?: number;
						retailPriceCAD?: number;
						retailPriceUSD?: number;
						shippingDepth: number;
						shippingDimension: string;
						shippingHeight: number;
						shippingWeight: number;
						shippingWidth: number;
						sku: string;
						status: "Active" | "Inactive" | "Discontinued";
						stockDate: number;
						stockQtyCAD: number;
						stockQtyUSD: number;
						styles: Array<
							| "Art Deco"
							| "Biophilic"
							| "Bohemian"
							| "Brutalism"
							| "Coastal"
							| "Colonial"
							| "Contemporary"
							| "Craftsman"
							| "Eclectic"
							| "French Country"
							| "Hollywood Glamour"
							| "Industrial"
							| "Japandi"
							| "Luxury"
							| "Maximalist"
							| "Mediterranean"
							| "Mid-Century Modern"
							| "Minimalist"
							| "Modern"
							| "Modern Farmhouse"
							| "Neoclassical"
							| "Neutral"
							| "Rustic"
							| "Scandinavian"
							| "Shabby Chic"
							| "Southwestern"
							| "Traditional"
							| "Transitional"
							| "Tudor"
							| "Victorian"
							| "Vintage"
						>;
						unitPerBox: number;
						updatedAt: number;
						vendorId: Id<"productVendors">;
						weight: number;
						weightUnit: "lb";
						width: number;
					} | null>
				>;
				getProductCategories: FunctionReference<"query", "public", any, any>;
				getProductCategoriesForSpace: FunctionReference<
					"query",
					"public",
					{
						spaceType:
							| "Attic"
							| "Basement"
							| "Bathroom"
							| "Bedroom"
							| "Classroom"
							| "Dining Room"
							| "Entryway"
							| "Event Space"
							| "Exercise Room"
							| "Kitchen"
							| "Laundry Room"
							| "Library"
							| "Living Room"
							| "Lobby"
							| "Locker Room"
							| "Lounge"
							| "Media Room"
							| "Medical Room"
							| "Meeting Room"
							| "Mudroom"
							| "Office"
							| "Outdoor Space"
							| "Spa"
							| "Walk-in Closet";
					},
					any
				>;
				getClientProductsWithFilters: FunctionReference<
					"query",
					"public",
					{
						currencyCode: "USD" | "CAD";
						paginationOptions?: { cursor?: string; numItems?: number };
						productFilter?: {
							availability?: "In Stock" | "Low Stock" | "Out of Stock";
							brand?: string;
							category?:
								| "Arm Chair"
								| "Artwork"
								| "Baking Dish"
								| "Bar Cart"
								| "Bar Stool"
								| "Bar Table"
								| "Bath Linens"
								| "Bathroom Accessory"
								| "Ornament"
								| "Bathtub"
								| "Bed"
								| "Bedding"
								| "Bedroom Vanity"
								| "Bench"
								| "Blind"
								| "Bookcase"
								| "Cabinet"
								| "Carpet"
								| "Ceiling Lamp"
								| "Ceiling Mirror"
								| "Chaise Lounge"
								| "Chest"
								| "Coat Rack"
								| "Coffee Table"
								| "Console Table"
								| "Cookware"
								| "Counter"
								| "Counter Stool"
								| "Crib"
								| "Crib Mattress"
								| "Crib Bed"
								| "Crib Bedding"
								| "Curtain"
								| "Desk"
								| "Desk Chair"
								| "Dining Chair"
								| "Dining Table"
								| "Dinnerware"
								| "Dresser"
								| "Entry Hook"
								| "Floor Lamp"
								| "Kettle"
								| "King Mattress"
								| "Kitchen Accessory"
								| "LED Light"
								| "Loveseat"
								| "Nightstand"
								| "Ottoman"
								| "Pendant Light"
								| "Pillow"
								| "Plant"
								| "Planter"
								| "Artificial Plant"
								| "Queen Mattress"
								| "Rack"
								| "Rug"
								| "Sconce"
								| "Sculpture"
								| "Sectional"
								| "Shelf"
								| "Shelving Unit"
								| "Shower Curtain"
								| "Side Table"
								| "Sideboard"
								| "Sofa"
								| "Sofa Bed"
								| "Standing Mirror"
								| "Stands"
								| "Storage Cabinet"
								| "Table Lamp"
								| "Tablecloth"
								| "Throw Blanket"
								| "Throw Pillow"
								| "TV Media Console"
								| "Twin Mattress"
								| "Vanity"
								| "Vanity Light"
								| "Wall Mirror"
								| "Wardrobe"
								| "Waste basket"
								| "Outdoor Arm Chair"
								| "Outdoor Rug"
								| "Outdoor Dining Chair"
								| "Outdoor Chair"
								| "Outdoor Coffee Table"
								| "Outdoor Dining Table"
								| "Outdoor Fire Pit"
								| "Outdoor Lounger"
								| "Outdoor Side Table"
								| "Outdoor Sofa"
								| "Outdoor Throw Pillow"
								| "Outdoor Umbrella"
								| "Outdoor Light"
								| "Outdoor Lantern"
								| "Outdoor Table"
								| "Outdoor Table Lamp"
								| "Outdoor LED Light"
								| "Outdoor Ceiling Lamp";
							maxDepth?: number;
							maxHeight?: number;
							maxPrice?: number;
							maxWeight?: number;
							maxWidth?: number;
							minDepth?: number;
							minHeight?: number;
							minPrice?: number;
							minWeight?: number;
							minWidth?: number;
							name?: string;
						};
						sortOptions?: {
							index:
								| "by_category_price_usd"
								| "by_category_price_cad"
								| "by_price_usd"
								| "by_price_cad";
							order: "asc" | "desc";
						};
					},
					any
				>;
				getClientProductsByCategoryWithFilters: FunctionReference<
					"query",
					"public",
					{
						category:
							| "Arm Chair"
							| "Artwork"
							| "Baking Dish"
							| "Bar Cart"
							| "Bar Stool"
							| "Bar Table"
							| "Bath Linens"
							| "Bathroom Accessory"
							| "Ornament"
							| "Bathtub"
							| "Bed"
							| "Bedding"
							| "Bedroom Vanity"
							| "Bench"
							| "Blind"
							| "Bookcase"
							| "Cabinet"
							| "Carpet"
							| "Ceiling Lamp"
							| "Ceiling Mirror"
							| "Chaise Lounge"
							| "Chest"
							| "Coat Rack"
							| "Coffee Table"
							| "Console Table"
							| "Cookware"
							| "Counter"
							| "Counter Stool"
							| "Crib"
							| "Crib Mattress"
							| "Crib Bed"
							| "Crib Bedding"
							| "Curtain"
							| "Desk"
							| "Desk Chair"
							| "Dining Chair"
							| "Dining Table"
							| "Dinnerware"
							| "Dresser"
							| "Entry Hook"
							| "Floor Lamp"
							| "Kettle"
							| "King Mattress"
							| "Kitchen Accessory"
							| "LED Light"
							| "Loveseat"
							| "Nightstand"
							| "Ottoman"
							| "Pendant Light"
							| "Pillow"
							| "Plant"
							| "Planter"
							| "Artificial Plant"
							| "Queen Mattress"
							| "Rack"
							| "Rug"
							| "Sconce"
							| "Sculpture"
							| "Sectional"
							| "Shelf"
							| "Shelving Unit"
							| "Shower Curtain"
							| "Side Table"
							| "Sideboard"
							| "Sofa"
							| "Sofa Bed"
							| "Standing Mirror"
							| "Stands"
							| "Storage Cabinet"
							| "Table Lamp"
							| "Tablecloth"
							| "Throw Blanket"
							| "Throw Pillow"
							| "TV Media Console"
							| "Twin Mattress"
							| "Vanity"
							| "Vanity Light"
							| "Wall Mirror"
							| "Wardrobe"
							| "Waste basket"
							| "Outdoor Arm Chair"
							| "Outdoor Rug"
							| "Outdoor Dining Chair"
							| "Outdoor Chair"
							| "Outdoor Coffee Table"
							| "Outdoor Dining Table"
							| "Outdoor Fire Pit"
							| "Outdoor Lounger"
							| "Outdoor Side Table"
							| "Outdoor Sofa"
							| "Outdoor Throw Pillow"
							| "Outdoor Umbrella"
							| "Outdoor Light"
							| "Outdoor Lantern"
							| "Outdoor Table"
							| "Outdoor Table Lamp"
							| "Outdoor LED Light"
							| "Outdoor Ceiling Lamp";
						currencyCode: "USD" | "CAD";
						paginationOptions?: { cursor?: string; numItems?: number };
						productFilter?: {
							availability?: "In Stock" | "Low Stock" | "Out of Stock";
							brand?: string;
							category?:
								| "Arm Chair"
								| "Artwork"
								| "Baking Dish"
								| "Bar Cart"
								| "Bar Stool"
								| "Bar Table"
								| "Bath Linens"
								| "Bathroom Accessory"
								| "Ornament"
								| "Bathtub"
								| "Bed"
								| "Bedding"
								| "Bedroom Vanity"
								| "Bench"
								| "Blind"
								| "Bookcase"
								| "Cabinet"
								| "Carpet"
								| "Ceiling Lamp"
								| "Ceiling Mirror"
								| "Chaise Lounge"
								| "Chest"
								| "Coat Rack"
								| "Coffee Table"
								| "Console Table"
								| "Cookware"
								| "Counter"
								| "Counter Stool"
								| "Crib"
								| "Crib Mattress"
								| "Crib Bed"
								| "Crib Bedding"
								| "Curtain"
								| "Desk"
								| "Desk Chair"
								| "Dining Chair"
								| "Dining Table"
								| "Dinnerware"
								| "Dresser"
								| "Entry Hook"
								| "Floor Lamp"
								| "Kettle"
								| "King Mattress"
								| "Kitchen Accessory"
								| "LED Light"
								| "Loveseat"
								| "Nightstand"
								| "Ottoman"
								| "Pendant Light"
								| "Pillow"
								| "Plant"
								| "Planter"
								| "Artificial Plant"
								| "Queen Mattress"
								| "Rack"
								| "Rug"
								| "Sconce"
								| "Sculpture"
								| "Sectional"
								| "Shelf"
								| "Shelving Unit"
								| "Shower Curtain"
								| "Side Table"
								| "Sideboard"
								| "Sofa"
								| "Sofa Bed"
								| "Standing Mirror"
								| "Stands"
								| "Storage Cabinet"
								| "Table Lamp"
								| "Tablecloth"
								| "Throw Blanket"
								| "Throw Pillow"
								| "TV Media Console"
								| "Twin Mattress"
								| "Vanity"
								| "Vanity Light"
								| "Wall Mirror"
								| "Wardrobe"
								| "Waste basket"
								| "Outdoor Arm Chair"
								| "Outdoor Rug"
								| "Outdoor Dining Chair"
								| "Outdoor Chair"
								| "Outdoor Coffee Table"
								| "Outdoor Dining Table"
								| "Outdoor Fire Pit"
								| "Outdoor Lounger"
								| "Outdoor Side Table"
								| "Outdoor Sofa"
								| "Outdoor Throw Pillow"
								| "Outdoor Umbrella"
								| "Outdoor Light"
								| "Outdoor Lantern"
								| "Outdoor Table"
								| "Outdoor Table Lamp"
								| "Outdoor LED Light"
								| "Outdoor Ceiling Lamp";
							maxDepth?: number;
							maxHeight?: number;
							maxPrice?: number;
							maxWeight?: number;
							maxWidth?: number;
							minDepth?: number;
							minHeight?: number;
							minPrice?: number;
							minWeight?: number;
							minWidth?: number;
							name?: string;
						};
						sortOptions?: {
							index:
								| "by_category_price_usd"
								| "by_category_price_cad"
								| "by_price_usd"
								| "by_price_cad";
							order: "asc" | "desc";
						};
					},
					any
				>;
				getProductBrands: FunctionReference<
					"query",
					"public",
					{
						category?:
							| "Arm Chair"
							| "Artwork"
							| "Baking Dish"
							| "Bar Cart"
							| "Bar Stool"
							| "Bar Table"
							| "Bath Linens"
							| "Bathroom Accessory"
							| "Ornament"
							| "Bathtub"
							| "Bed"
							| "Bedding"
							| "Bedroom Vanity"
							| "Bench"
							| "Blind"
							| "Bookcase"
							| "Cabinet"
							| "Carpet"
							| "Ceiling Lamp"
							| "Ceiling Mirror"
							| "Chaise Lounge"
							| "Chest"
							| "Coat Rack"
							| "Coffee Table"
							| "Console Table"
							| "Cookware"
							| "Counter"
							| "Counter Stool"
							| "Crib"
							| "Crib Mattress"
							| "Crib Bed"
							| "Crib Bedding"
							| "Curtain"
							| "Desk"
							| "Desk Chair"
							| "Dining Chair"
							| "Dining Table"
							| "Dinnerware"
							| "Dresser"
							| "Entry Hook"
							| "Floor Lamp"
							| "Kettle"
							| "King Mattress"
							| "Kitchen Accessory"
							| "LED Light"
							| "Loveseat"
							| "Nightstand"
							| "Ottoman"
							| "Pendant Light"
							| "Pillow"
							| "Plant"
							| "Planter"
							| "Artificial Plant"
							| "Queen Mattress"
							| "Rack"
							| "Rug"
							| "Sconce"
							| "Sculpture"
							| "Sectional"
							| "Shelf"
							| "Shelving Unit"
							| "Shower Curtain"
							| "Side Table"
							| "Sideboard"
							| "Sofa"
							| "Sofa Bed"
							| "Standing Mirror"
							| "Stands"
							| "Storage Cabinet"
							| "Table Lamp"
							| "Tablecloth"
							| "Throw Blanket"
							| "Throw Pillow"
							| "TV Media Console"
							| "Twin Mattress"
							| "Vanity"
							| "Vanity Light"
							| "Wall Mirror"
							| "Wardrobe"
							| "Waste basket"
							| "Outdoor Arm Chair"
							| "Outdoor Rug"
							| "Outdoor Dining Chair"
							| "Outdoor Chair"
							| "Outdoor Coffee Table"
							| "Outdoor Dining Table"
							| "Outdoor Fire Pit"
							| "Outdoor Lounger"
							| "Outdoor Side Table"
							| "Outdoor Sofa"
							| "Outdoor Throw Pillow"
							| "Outdoor Umbrella"
							| "Outdoor Light"
							| "Outdoor Lantern"
							| "Outdoor Table"
							| "Outdoor Table Lamp"
							| "Outdoor LED Light"
							| "Outdoor Ceiling Lamp";
						paginationOptions?: { cursor?: string; numItems?: number };
					},
					any
				>;
			};
			vendor: {
				mutation: {
					createVendor: FunctionReference<
						"mutation",
						"public",
						{
							data: { name: string; r2FolderId: string; vId: string };
							poApiKey: string;
						},
						any
					>;
				};
			};
			error: {
				mutation: {
					logPoProductError: FunctionReference<
						"mutation",
						"public",
						{
							data: { details?: Array<any>; message: string };
							poApiKey: string;
						},
						{ message: string }
					>;
				};
			};
			statistics: {
				query: {
					getPoAllProductCategoryStatistic: FunctionReference<
						"query",
						"public",
						{ poApiKey: string },
						Array<{
							category:
								| "Arm Chair"
								| "Artwork"
								| "Baking Dish"
								| "Bar Cart"
								| "Bar Stool"
								| "Bar Table"
								| "Bath Linens"
								| "Bathroom Accessory"
								| "Ornament"
								| "Bathtub"
								| "Bed"
								| "Bedding"
								| "Bedroom Vanity"
								| "Bench"
								| "Blind"
								| "Bookcase"
								| "Cabinet"
								| "Carpet"
								| "Ceiling Lamp"
								| "Ceiling Mirror"
								| "Chaise Lounge"
								| "Chest"
								| "Coat Rack"
								| "Coffee Table"
								| "Console Table"
								| "Cookware"
								| "Counter"
								| "Counter Stool"
								| "Crib"
								| "Crib Mattress"
								| "Crib Bed"
								| "Crib Bedding"
								| "Curtain"
								| "Desk"
								| "Desk Chair"
								| "Dining Chair"
								| "Dining Table"
								| "Dinnerware"
								| "Dresser"
								| "Entry Hook"
								| "Floor Lamp"
								| "Kettle"
								| "King Mattress"
								| "Kitchen Accessory"
								| "LED Light"
								| "Loveseat"
								| "Nightstand"
								| "Ottoman"
								| "Pendant Light"
								| "Pillow"
								| "Plant"
								| "Planter"
								| "Artificial Plant"
								| "Queen Mattress"
								| "Rack"
								| "Rug"
								| "Sconce"
								| "Sculpture"
								| "Sectional"
								| "Shelf"
								| "Shelving Unit"
								| "Shower Curtain"
								| "Side Table"
								| "Sideboard"
								| "Sofa"
								| "Sofa Bed"
								| "Standing Mirror"
								| "Stands"
								| "Storage Cabinet"
								| "Table Lamp"
								| "Tablecloth"
								| "Throw Blanket"
								| "Throw Pillow"
								| "TV Media Console"
								| "Twin Mattress"
								| "Vanity"
								| "Vanity Light"
								| "Wall Mirror"
								| "Wardrobe"
								| "Waste basket"
								| "Outdoor Arm Chair"
								| "Outdoor Rug"
								| "Outdoor Dining Chair"
								| "Outdoor Chair"
								| "Outdoor Coffee Table"
								| "Outdoor Dining Table"
								| "Outdoor Fire Pit"
								| "Outdoor Lounger"
								| "Outdoor Side Table"
								| "Outdoor Sofa"
								| "Outdoor Throw Pillow"
								| "Outdoor Umbrella"
								| "Outdoor Light"
								| "Outdoor Lantern"
								| "Outdoor Table"
								| "Outdoor Table Lamp"
								| "Outdoor LED Light"
								| "Outdoor Ceiling Lamp";
							countCAD: number;
							countUSD: number;
							maxRetailPriceCAD: number;
							maxRetailPriceUSD: number;
							minRetailPriceCAD: number;
							minRetailPriceUSD: number;
						}>
					>;
				};
			};
		};
		user: {
			mutation: {
				updateUserById: FunctionReference<
					"mutation",
					"public",
					{
						updates: {
							authToken?: string;
							currentWorkspaceId?: Id<"workspaces">;
							email?: string;
							firstName?: string;
							fullName?: string;
							imageUrl?: string;
							lastLoginAt?: number;
							lastName?: string;
							phone?: string;
							updatedAt?: number;
						};
					},
					any
				>;
			};
			query: { getUser: FunctionReference<"query", "public", any, any> };
		};
		workspace: {
			asset: {
				query: {
					getWorkspaceAssets: FunctionReference<
						"query",
						"public",
						{ workspaceId: Id<"workspaces"> },
						any
					>;
					getWorkspaceAssetsByType: FunctionReference<
						"query",
						"public",
						{ type: "inspo" | "floorplan"; workspaceId: Id<"workspaces"> },
						any
					>;
				};
			};
			query: {
				getWorkspaceById: FunctionReference<
					"query",
					"public",
					{ workspaceId: Id<"workspaces"> },
					any
				>;
				getUserWorkspaces: FunctionReference<"query", "public", any, any>;
			};
		};
	};
};
export type InternalApiType = {};
