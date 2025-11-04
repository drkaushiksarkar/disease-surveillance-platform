"use client";

import { LocationFilter } from '../filters/location-filter';
import { DiseaseFilter } from '../filters/disease-filter';
import { DateRangeFilter } from '../filters/date-range-filter';
import { Card } from '@/components/ui/card';

interface FilterBarProps {
  hideUpazila?: boolean;
}

export default function FilterBar({ hideUpazila = false }: FilterBarProps) {
  return (
    <Card className="bg-gray-50 p-4 shadow-md">
      <div className="flex flex-wrap gap-6 items-end">
        <div className="w-[200px]">
          <DiseaseFilter />
        </div>
        <div className="flex-1 min-w-[300px]">
          <LocationFilter hideUpazila={hideUpazila} />
        </div>
        <div className="w-[280px]">
          <DateRangeFilter />
        </div>
      </div>
    </Card>
  );
}
