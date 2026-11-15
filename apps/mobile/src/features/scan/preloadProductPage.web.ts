/**
 * Web routes load on first visit, and React then holds the blank screen for ~300 ms before showing it.
 * Loading the product page while the lookup is in flight lets it render the moment the answer arrives.
 */
export const preloadProductPage = () => {
  void import('../../../app/product/[id]/index').catch(() => undefined); // the route retries the load itself
};
