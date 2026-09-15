import { BusinessDetailSkeleton } from "@/components/business-detail-skeleton";

// Route-level loading UI: shown instantly while the segment's JS/RSC payload streams in.
// The client page then keeps rendering the same skeleton until the truck data arrives,
// so the user sees one continuous placeholder instead of two different loaders.
export default function Loading() {
  return <BusinessDetailSkeleton />;
}
