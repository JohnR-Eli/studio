"use client";

import { SimilarItem } from "@/ai/flows/find-similar-items";
import { Card, CardContent } from "@/components/ui/card";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ClosetRecommendationsProps {
  items: SimilarItem[];
  isLoading: boolean;
  error: string | null;
}

export default function ClosetRecommendations({ items, isLoading, error }: ClosetRecommendationsProps) {
  if (isLoading) {
    return <div className="mt-8 w-full"><LoadingSpinner message="Fetching recommendations..." /></div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-8">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Error Fetching Recommendations</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (items.length === 0) {
    return null; // Don't show anything if there are no items and no loading/error state
  }

  return (
    <div className="mt-12 w-full">
      <h3 className="text-2xl font-bold text-center mb-6">Items You Might Like</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((item, index) => (
          <Card key={index} className="overflow-hidden group transition-all hover:shadow-lg">
            <CardContent className="p-0">
              <div className="relative aspect-[4/5] bg-muted">
                <NextImage
                  src={item.imageURL}
                  alt={item.productName}
                  fill={true}
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                  style={{objectFit: 'cover'}}
                  className="transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4 border-t">
                <h4 className="font-semibold text-md truncate" title={item.productName}>
                  {item.productName}
                </h4>
                <p className="text-sm text-muted-foreground">{item.merchantName}</p>
                <div className="flex justify-between items-center mt-3">
                  <p className="font-bold text-lg">{item.itemPrice}</p>
                  <Button asChild variant="secondary" size="sm">
                    <a href={item.vendorLink} target="_blank" rel="noopener noreferrer">
                      View
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
