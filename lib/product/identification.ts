/**
 * How a product was identified.
 * The live scanner uses label photos. Barcode lookup can be added later
 * without changing the analysis result shape.
 */
export type ProductSource = "label-image" | "barcode";

export interface ProductIdentifier {
  source: ProductSource;
  /** Present when source is "barcode". */
  barcode?: string;
}

export interface ProductLookupResult {
  name: string | null;
  brand: string | null;
  source: ProductSource;
}
