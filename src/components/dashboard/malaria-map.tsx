"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl, { Map, LngLatBoundsLike } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const MapLegend = ({ title, stops }: { title: string, stops: [number, string][] }) => {
    if (!stops || stops.length === 0) {
        return null;
    }

    return (
        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-md max-w-xs">
            <h3 className="font-semibold text-sm mb-2">{title}</h3>
            <div className="flex flex-col gap-1">
                {stops.map(([value, color], i) => {
                    const nextValue = stops[i + 1]?.[0];
                    let label = '';

                    if (i === 0 && nextValue !== undefined) {
                        label = `< ${nextValue}`;
                    } else if (i === stops.length - 1) {
                        label = `≥ ${value}`;
                    } else if (nextValue !== undefined) {
                        label = `${value} - ${nextValue}`;
                    } else {
                        label = `${value}`;
                    }

                    return (
                        <div key={i} className="flex items-center gap-2">
                            <span style={{ backgroundColor: color }} className="w-4 h-4 rounded-sm border border-black/20" />
                            <span className="text-xs">{label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

type MalariaSpecies = 'pv_rate' | 'pf_rate' | 'mixed_rate';

export default function MalariaMap() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<Map | null>(null);
    const [geojsonData, setGeojsonData] = useState<any>(null);
    const [species, setSpecies] = useState<MalariaSpecies>('pv_rate');
    const [isContainerReady, setIsContainerReady] = useState(false);

    // Dynamic color stops based on actual data values (similar to dengue map)
    const colorStops: [number, string][] = useMemo(() => {
        if (!geojsonData || !geojsonData.features) return [[0, '#ffffcc']];

        const values = geojsonData.features
            .map((f: any) => f.properties?.[species])
            .filter((v: number) => v !== undefined && v !== null && !isNaN(v) && v > 0);

        if (values.length === 0) return [[0, '#ffffcc']];

        const maxVal = Math.max(...values);
        const minVal = Math.min(...values);

        // If all values are the same, return a simple scale
        if (maxVal === minVal) {
            return [
                [0, '#ffffcc'],
                [maxVal, '#e31a1c']
            ];
        }

        // Yellow to dark red color scale for forecast values
        const colors = ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#bd0026'];

        const stops: [number, string][] = [];
        const usedValues = new Set<number>();

        for (let i = 0; i < colors.length; i++) {
            const t = i / (colors.length - 1);
            // Use exponential distribution for better visual separation
            const value = minVal + (maxVal - minVal) * Math.pow(t, 1.5);
            const roundedValue = Math.round(value);

            // Only add if this value hasn't been used and maintains ascending order
            if (!usedValues.has(roundedValue) &&
                (stops.length === 0 || roundedValue > stops[stops.length - 1][0])) {
                stops.push([roundedValue, colors[i]]);
                usedValues.add(roundedValue);
            }
        }

        // Ensure we have at least 2 stops for interpolation
        if (stops.length < 2) {
            return [
                [minVal, '#ffffcc'],
                [maxVal, '#e31a1c']
            ];
        }

        return stops;
    }, [geojsonData, species]);

    useEffect(() => {
        async function loadData() {
            try {
                const [geojsonRes, apiRes] = await Promise.all([
                    fetch('/geo/malaria.geojson'),
                    fetch('/api/data/malaria')
                ]);

                if (!geojsonRes.ok || !apiRes.ok) {
                    console.error("Failed to fetch map data");
                    return;
                }

                const geojson = await geojsonRes.json();
                const apiData = await apiRes.json();

                // Create lookup map - try both UpazilaID and upazila name
                const predictionsByUpazila: { [key: string]: any } = {};
                const predictionsByName: { [key: string]: any } = {};

                apiData.forEach((row: any) => {
                    const pvRate = Number(row.pv_rate) || 0;
                    const pfRate = Number(row.pf_rate) || 0;
                    const mixedSum = pvRate + pfRate;

                    // Debug logging
                    if (mixedSum > 0) {
                        console.log('Malaria data:', {
                            upazila: row.upazila_id,
                            pv_rate: pvRate,
                            pf_rate: pfRate,
                            mixed_rate: mixedSum,
                            original_mixed: row.mixed_rate
                        });
                    }

                    const data = {
                        pv_rate: pvRate,
                        pf_rate: pfRate,
                        mixed_rate: mixedSum
                    };

                    if (row.UpazilaID) {
                        predictionsByUpazila[row.UpazilaID] = data;
                    }
                    if (row.upazila_id) {
                        predictionsByUpazila[row.upazila_id] = data;
                    }
                    if (row.upazila) {
                        // Normalize name for matching (lowercase, trim)
                        const normalized = row.upazila.toLowerCase().trim();
                        predictionsByName[normalized] = data;
                    }
                });

                // Join predictions with geojson features
                geojson.features.forEach((feature: any) => {
                    const upazilaId = feature.properties.UpazilaID;
                    const upazilaName = feature.properties.UPA_NAME;

                    // Try matching by ID first, then by name
                    let predictions = predictionsByUpazila[upazilaId];
                    if (!predictions && upazilaName) {
                        const normalized = upazilaName.toLowerCase().trim();
                        predictions = predictionsByName[normalized];
                    }

                    if (predictions) {
                        feature.properties.pv_rate = predictions.pv_rate;
                        feature.properties.pf_rate = predictions.pf_rate;
                        feature.properties.mixed_rate = predictions.mixed_rate;

                        // Debug: Log when we set mixed rate
                        if (predictions.mixed_rate > 0) {
                            console.log('Setting feature properties:', {
                                upazila: upazilaName,
                                pv_rate: predictions.pv_rate,
                                pf_rate: predictions.pf_rate,
                                mixed_rate: predictions.mixed_rate
                            });
                        }
                    } else {
                        // Set default values if no prediction data
                        feature.properties.pv_rate = 0;
                        feature.properties.pf_rate = 0;
                        feature.properties.mixed_rate = 0 + 0; // Sum of pv_rate and pf_rate
                    }
                });
                setGeojsonData(geojson);
            } catch (error) {
                console.error("Error loading map data:", error);
            }
        }

        loadData();
    }, []);

    // Wait for container to be ready
    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        // Use setTimeout to ensure the container has been painted
        const timer = setTimeout(() => {
            if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                setIsContainerReady(true);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!containerRef.current || !geojsonData || !isContainerReady) return;
        if (mapRef.current) mapRef.current.remove();

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: {
                version: 8,
                sources: {
                    'osm': {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors',
                    }
                },
                layers: [{ id: 'osm-raster', type: 'raster', source: 'osm' }],
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
            },
            center: [91.8, 22.3],
            zoom: 7,
            attributionControl: false,
            preserveDrawingBuffer: true, // Enable screenshot capture
        });

        mapRef.current = map;

        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
        map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');

        map.on('load', () => {
            map.addSource('malaria-data', {
                type: 'geojson',
                data: geojsonData
            });

            // Create fill color expression
            const fillColorExpression = [
                'interpolate',
                ['linear'],
                ['get', species],
                ...colorStops.flatMap(([value, color]) => [value, color])
            ];

            map.addLayer({
                id: 'malaria-fill',
                type: 'fill',
                source: 'malaria-data',
                paint: {
                    'fill-opacity': 0.7,
                    'fill-color': fillColorExpression as any
                }
            });

            map.addLayer({
                id: 'malaria-outline',
                type: 'line',
                source: 'malaria-data',
                paint: { 'line-width': 0.5, 'line-color': '#333' }
            });
            
            try {
                const bbox = turf.bbox(geojsonData) as LngLatBoundsLike;
                map.fitBounds(bbox, { padding: 24 });
            } catch (e) {
                console.error("Could not fit bounds", e);
            }

            const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
            map.on('mousemove', 'malaria-fill', (e: any) => {
                const f = e.features && e.features[0];
                if (!f) return;
                const p = f.properties || {};
                const forecast = p[species];

                // Debug logging for mixed rate
                if (species === 'mixed_rate') {
                    console.log('Tooltip data:', {
                        upazila: p.UPA_NAME,
                        pv_rate: p.pv_rate,
                        pf_rate: p.pf_rate,
                        mixed_rate: p.mixed_rate,
                        forecast: forecast
                    });
                }

                // Display as integer (already converted in the data)
                const displayValue = forecast !== undefined && forecast !== null ? forecast : 'No data';
                const speciesLabel = species === 'pv_rate' ? 'Vivax' : species === 'pf_rate' ? 'Falciparum' : 'Total Malaria';
                const html = `<div style="font-size:12px; color: #000;"><b>Upazila:</b> ${p.UPA_NAME || ''}<br/><b>${speciesLabel} Forecast:</b> ${displayValue}</div>`;
                popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'malaria-fill', () => {
                popup.remove();
                map.getCanvas().style.cursor = '';
            });
        });
        
        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        }

    }, [geojsonData, species, isContainerReady, colorStops]);


    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded() || !geojsonData) return;
        
        const fillColorExpression = [
            'interpolate',
            ['linear'],
            ['get', species],
            ...colorStops.flatMap(([value, color]) => [value, color])
        ];

        map.setPaintProperty('malaria-fill', 'fill-color', fillColorExpression as any);

    }, [species, geojsonData, colorStops]);

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="font-headline">Malaria Geospatial Forecast Map</CardTitle>
                <CardDescription>
                    Next week malaria forecast by upazila based on species (Vivax, Falciparum, or Mixed).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative w-full">
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-2">
                        <MapLegend title="Total Predicted Cases" stops={colorStops} />
                        <div className="bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-md max-w-xs space-y-2">
                            <Label htmlFor="species-select">Species</Label>
                            <Select value={species} onValueChange={(value) => setSpecies(value as MalariaSpecies)}>
                                <SelectTrigger id="species-select">
                                    <SelectValue placeholder="Select Species" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pv_rate">Vivax</SelectItem>
                                    <SelectItem value="pf_rate">Falciparum</SelectItem>
                                    <SelectItem value="mixed_rate">Total Malaria</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div ref={containerRef} style={{ height: '550px', width: '100%' }} className="rounded-lg overflow-hidden shadow" />
                </div>
            </CardContent>
        </Card>
    );
}