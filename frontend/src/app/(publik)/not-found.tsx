import { NotFoundContent } from "@/components/common/not-found-content";

/** 404 di dalam layout publik, mis. /kos/slug-yang-tidak-ada (navbar dan footer tetap tampil). */
export default function PublicNotFound() {
  return <NotFoundContent />;
}
