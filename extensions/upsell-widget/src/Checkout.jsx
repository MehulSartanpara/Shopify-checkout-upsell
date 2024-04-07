import {
  Banner,
  BlockLayout,
  BlockStack,
  Button,
  Divider,
  Heading,
  Icon,
  Image,
  InlineLayout,
  Grid,
  SkeletonImage,
  SkeletonText,
  Style,
  Text,
  TextBlock,
  reactExtension,
  useApi,
  useApplyCartLinesChange,
  useCartLines,
  useSettings
} from "@shopify/ui-extensions-react/checkout";
import React, { useEffect, useState } from "react";

// Set up the entry point for the extension
export default reactExtension("purchase.checkout.block.render", () => <App />);

function App() {
  const { query, i18n } = useApi();
  // [START product-offer-pre-purchase.add-to-cart]
  const applyCartLinesChange = useApplyCartLinesChange();
  // [END product-offer-pre-purchase.add-to-cart]

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showError, setShowError] = useState(false);
  const { banner_title, collection_handle, product_limit, button_label } = useSettings();
  const productlimitVar = product_limit !== undefined ? product_limit : 10;

  // [START product-offer-pre-purchase.retrieve-cart-data]
  const lines = useCartLines();
  // [END product-offer-pre-purchase.retrieve-cart-data]

  // collection_handle = 'checkout-upsell'

  useEffect(() => {
    if(collection_handle !== undefined){  
      fetchProducts();
    }
  }, []);

  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  // [add-to-cart]
  async function handleAddToCart(variantId) {
    setAdding(true);
    const result = await applyCartLinesChange({
      type: 'addCartLine',
      merchandiseId: variantId,
      quantity: 1,
    });
    setAdding(false);
    if (result.type === 'error') {
      setShowError(true);
      console.error(result.message);
    }
  }
  // [add-to-cart]

  // [retrieve-products]
  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await query(
        `query {  
          collectionByHandle(handle: "${collection_handle}") {
            id
            title
            products(first: ${productlimitVar}, sortKey: BEST_SELLING) {
              edges {
                node {
                  id
                  title                  
                  images(first:1){
                    nodes {
                      url
                    }
                  }
                  variants(first: 1) {
                    nodes {
                      id
                      price {
                        amount
                      }
                    }
                  }
                  availableForSale                  
                }
              }
            }
          }
        }`
      );

      console.log('GraphQL Data: ', res);
      if (res?.data?.collectionByHandle === null) {
        console.log("no products found");
        setProducts([]);
      } else {
        if (res?.errors === undefined) {
          let availableProducts = res?.data?.collectionByHandle?.products?.edges.filter(
            ({ node }) => node.availableForSale
          )
          setProducts(availableProducts);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }
  // [retrieve-products]

  if (loading) {
    return <LoadingSkeleton title={banner_title} button_label={button_label || 'Button'} />;
  }

  if (!loading && products.length === 0) {
    return null;
  }

  if (products.length === 0) {
    return null;
  }

  const productsOnOffer = getProductsOnOffer(lines, products);

  if (!productsOnOffer.length) {
    return null;
  }

  return (
    <ProductOffer
      i18n={i18n}
      adding={adding}
      handleAddToCart={handleAddToCart}
      showError={showError}
      products={productsOnOffer}
      title={banner_title}
      button_label={button_label || 'Button'}
    />
  );
}

function LoadingSkeleton({ title, button_label }) {
  return (
    <>
      <BlockStack spacing='loose'>
        <Divider />
        <Heading level={2}>{title || ''}</Heading>
        <BlockStack spacing='loose'>
          <InlineLayout
            spacing='base'
            columns={['auto', 'auto', 'auto']}
            blockAlignment='center'
            maxInlineSize='130px'
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <BlockStack spacing='none' key={index}>
                <BlockLayout rows={[120, 'fill', 'auto']}>
                  <SkeletonImage aspectRatio={1} />
                  <BlockStack spacing='none'>
                    <SkeletonText inlineSize='large' />
                    <SkeletonText inlineSize='small' />
                  </BlockStack>
                  <Button kind='secondary' disabled={true}>
                    {button_label}
                  </Button>
                </BlockLayout>
              </BlockStack>
            ))}
          </InlineLayout>
        </BlockStack>
      </BlockStack>
    </>
  );
}
function getProductsOnOffer(lines, products) {
  const cartLineProductVariantIds = lines.map((item) => item.merchandise.id);
  return products.filter((product) => {
    const isProductVariantInCart = product.node.variants.nodes.some(({ id }) =>
      cartLineProductVariantIds.includes(id)
    );
    return !isProductVariantInCart;
  });
}
function ProductOffer({ i18n, adding, handleAddToCart, showError, products, title, button_label }) {
  const [currentId, setCurrentId] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const productsPerPage = 3;
  const totalPages = Math.ceil(products.length / productsPerPage);
  
  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };
  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  function truncateString(inputString, maxLength) {
    if (inputString.length > maxLength) {
      return inputString.substring(0, maxLength) + '...';
    }
    return inputString;
  }

  const startIndex = currentPage * productsPerPage;
  const visibleProducts = products.slice(startIndex, startIndex + productsPerPage);
  return (
    <>
      <BlockStack spacing='loose'>
        <Divider />
        <InlineLayout
          spacing='base'
          columns={['fill', 'auto', 'auto']}
          blockAlignment='center'
          maxInlineSize='130px'
        >
          <Heading level={1}>{title || ''}</Heading>
          <Button
            kind='secondary'
            accessibilityLabel={`Previous`}
            onPress={() => { handlePrevious(); }}
          >
            <Icon source="chevronLeft" />
          </Button>
          <Button
            kind='secondary'
            accessibilityLabel={`Next`}
            border="base"
            borderRadius={'large'}
            onPress={() => { handleNext(); }}
          >
            <Icon source="chevronRight" />
          </Button>
        </InlineLayout>
        <BlockStack spacing='loose'>
          <InlineLayout
            spacing='base'
            columns={['1fr', '1fr', '1fr']}
            blockAlignment='top'
            minBlockSize='130px'
          >
            {visibleProducts?.map((node) => (
              <BlockStack spacing='none' key={node?.node?.id}>
                <BlockLayout rows={Style.default(['auto', 'auto', 'auto']).when({ viewportInlineSize: { min: 'small' } }, ['auto', 'auto', 'auto'])}>
                  <Image
                    border='base'
                    borderRadius={'large'}
                    borderWidth='base'
                    source={node?.node?.images?.nodes?.[0]?.url ??
                      'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_medium.png?format=webp&v=1530129081'}
                    description={node.node.title}
                    aspectRatio={1 / 1}
                  />
                  <BlockStack spacing='extraTight' padding={["extraTight","none", "extraTight", "none"]} inlineAlignment="center">
                    <TextBlock size={'small'} inlineAlignment="center">
                      <Text size="base" appearance="base">{truncateString(node?.node?.title, 30)}</Text>
                    </TextBlock>
                    {node?.node?.variants?.nodes?.[0]?.price?.amount && <Text appearance='base' size='small'>{i18n.formatCurrency(node?.node?.variants?.nodes?.[0]?.price?.amount)}</Text>}
                  </BlockStack>
                  <Grid
                    rows={[30, 'auto']}
                    overflow="hidden"
                    border="base"
                    borderRadius="base"
                    >
                      <BlockLayout rows={[8]} border="none" borderRadius="base" overflow="hidden" blockAlignment="center">
                        <Button
                          kind="primary"
                          border="base"
                          // appearance='base'
                          borderWidth={'medium'}
                          cornerRadius="large"
                          padding="extraTight"
                          blockAlignment="center"
                          inlineAlignment="center"
                          loading={currentId === node.node.variants.nodes[0].id ? adding : false}
                          accessibilityLabel={`Add ${node.node.title} to cart`}
                          onPress={() => { setCurrentId(node.node.variants.nodes[0].id); handleAddToCart(node?.node?.variants?.nodes?.[0]?.id); }}
                        >
                          <Text emphasis="bold" appearance='base' size="small">
                            {currentId === node.node.variants.nodes[0].id ? adding ? 'Adding...' : button_label : button_label}
                          </Text>
                        </Button>
                      </BlockLayout>
                  </Grid>
                </BlockLayout>
              </BlockStack>
            ))}
          </InlineLayout>
        </BlockStack>
        {showError && <ErrorBanner />}
      </BlockStack>
    </>
  );
}
// [END product-offer-pre-purchase.offer-ui]

// [START product-offer-pre-purchase.error-ui]
function ErrorBanner() {
  return (
    <Banner status='critical'>
      There was an issue adding this product. Please try again.
    </Banner>
  );
}
// [END product-offer-pre-purchase.error-ui]