"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClosetAnalysisResult } from "@/ai/flows/types";
import { Badge } from "@/components/ui/badge";

interface ClosetAnalysisResultsProps {
  analysis: ClosetAnalysisResult;
}

export default function ClosetAnalysisResults({ analysis }: ClosetAnalysisResultsProps) {
  return (
    <div className="w-full">
      <h3 className="text-2xl font-bold text-center mb-6">Your Closet Analysis</h3>
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="items">Item Types</TabsTrigger>
          <TabsTrigger value="styles">Styles</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
        </TabsList>
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Dominant Item Types</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {analysis.dominantClothingItems.map((item, index) => (
                  <li key={index} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{item.item}</span>
                    <Badge variant="secondary">{item.count} item(s)</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="styles">
          <Card>
            <CardHeader>
              <CardTitle>Dominant Styles</CardTitle>
            </CardHeader>
            <CardContent>
               <ul className="space-y-3">
                {analysis.dominantStyles.map((style, index) => (
                  <li key={index} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{style.style}</span>
                     <Badge variant="secondary">{style.count} item(s)</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="brands">
          <Card>
            <CardHeader>
              <CardTitle>Recommended Brands</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analysis.recommendedBrands.map((brand, index) => (
                  <Badge key={index} variant="outline" className="text-base px-3 py-1">{brand}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
