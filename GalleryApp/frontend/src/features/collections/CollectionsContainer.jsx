import { useEffect, useState } from "react";
import { collectionsApi } from "../../api/collectionsApi";
import CollectionsPage from "./CollectionsPage";

export default function CollectionsContainer() {
  const [collections, setCollections] = useState([]);
  const [isCollectionsLoading, setIsCollectionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadCollections = async () => {
      setIsCollectionsLoading(true);
      try {
        const response = await collectionsApi.listCollections();
        if (!cancelled) {
          setCollections(Array.isArray(response?.items) ? response.items : []);
        }
      } finally {
        if (!cancelled) {
          setIsCollectionsLoading(false);
        }
      }
    };

    void loadCollections();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CollectionsPage
      openCreateCollectionModal={() => {}}
      isCollectionsLoading={isCollectionsLoading}
      collections={collections}
      handleOpenCollection={async () => {}}
    />
  );
}
