import { NextResponse } from 'next/server';
import { query, table } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Feature descriptions for better understanding
const FEATURE_DESCRIPTIONS: { [key: string]: { label: string; description: string; icon?: string } } = {
  'Avg_Temperature': {
    label: 'Temperature',
    description: 'Higher temperatures (25-30°C) accelerate mosquito metabolism, reproductive rates, and the replication speed of pathogens inside mosquitoes (extrinsic incubation period). This shortens the time between mosquito infection and transmission capability, increasing outbreak risk.',
    icon: 'Thermometer'
  },
  'temperature': {
    label: 'Temperature',
    description: 'Higher temperatures increase bacterial growth rates in contaminated water and food. Warm conditions also speed up food spoilage and pathogen multiplication. For waterborne diseases like diarrhoea, temperature affects both water quality and bacterial survival in the environment.',
    icon: 'Thermometer'
  },
  'Total_Rainfall': {
    label: 'Rainfall',
    description: 'Heavy rainfall creates stagnant water pools that serve as breeding grounds for mosquitoes (Aedes, Anopheles). The lag represents the time needed for mosquito larvae to mature and for disease transmission to increase. Additionally, flooding can contaminate water sources, leading to waterborne diseases like diarrhoea.',
    icon: 'CloudRain'
  },
  'rainfall': {
    label: 'Rainfall',
    description: 'Heavy rainfall can contaminate water sources through runoff from agricultural areas and sewage overflow. Flooding damages sanitation infrastructure and increases exposure to contaminated water. The lag represents the time for contamination to occur and for cases to manifest after exposure.',
    icon: 'CloudRain'
  },
  'Avg_Humidity': {
    label: 'Humidity',
    description: 'While moderate humidity (60-80%) supports mosquito survival, extremely high humidity (>90%) can actually reduce mosquito activity and disease transmission. The negative coefficient suggests that in Bangladesh\'s context, very high humidity periods may correspond with other conditions that suppress outbreaks, such as heavy continuous rain that flushes breeding sites.',
    icon: 'Droplets'
  },
  'humidity': {
    label: 'Humidity',
    description: 'High humidity levels can affect food preservation and water storage conditions. In tropical regions like Bangladesh, humidity influences bacterial survival in the environment and affects the transmission of gastrointestinal pathogens through contaminated surfaces and food.',
    icon: 'Droplets'
  },
  'average_temperature': {
    label: 'Temperature',
    description: 'Higher temperatures (25-30°C) accelerate mosquito metabolism, reproductive rates, and the replication speed of malaria parasites inside mosquitoes (extrinsic incubation period). This shortens the time between mosquito infection and transmission capability, increasing malaria outbreak risk.',
    icon: 'Thermometer'
  },
  'total_rainfall': {
    label: 'Rainfall',
    description: 'Heavy rainfall creates stagnant water pools that serve as breeding grounds for Anopheles mosquitoes, the primary vector for malaria. The lag represents the time needed for mosquito larvae to mature and for malaria transmission to increase in the population.',
    icon: 'CloudRain'
  },
  'relative_humidity': {
    label: 'Humidity',
    description: 'Moderate humidity (60-80%) supports Anopheles mosquito survival and malaria parasite development. High humidity extends mosquito lifespan, increasing the probability that infected mosquitoes will survive long enough to transmit malaria parasites to humans.',
    icon: 'Droplets'
  },
  'weekly_hospitalised_cases': {
    label: 'Previous Cases',
    description: 'Recent case counts are strong indicators of ongoing transmission chains. The lag captures the typical incubation period for most diseases. A rise in cases indicates active circulation of pathogens and infected vectors in the community, suggesting continued transmission is likely.',
    icon: 'TrendingUp'
  },
  'daily_cases': {
    label: 'Previous Cases',
    description: 'Recent case counts indicate active transmission of gastrointestinal pathogens in the community. For diarrhoeal diseases, person-to-person transmission and common source outbreaks (contaminated water or food) can cause rapid spread. Historical case patterns help predict future outbreak dynamics.',
    icon: 'TrendingUp'
  },
  'prev_y': {
    label: 'Previous Cases',
    description: 'Recent case counts are strong indicators of ongoing transmission chains. The lag captures the typical incubation period for most diseases. A rise in cases indicates active circulation of pathogens and infected vectors in the community, suggesting continued transmission is likely.',
    icon: 'TrendingUp'
  },
  'district_capacity_proxy': {
    label: 'District Capacity',
    description: 'Districts with better healthcare infrastructure, surveillance systems, and intervention capacity tend to detect cases earlier and implement control measures more effectively. This includes vector control programs, public awareness campaigns, and enhanced medical response capacity.',
    icon: 'Building2'
  },
  'case_growth_1w': {
    label: 'Case Growth (1 week)',
    description: 'The rate of change in cases over one week indicates the acceleration or deceleration of the outbreak. Rapid growth suggests the epidemic is expanding, while negative growth indicates control measures may be working.',
    icon: 'Activity'
  },
  'case_growth_2w': {
    label: 'Case Growth (2 weeks)',
    description: 'Two-week growth rates provide a smoother signal of outbreak trends, filtering out weekly noise. This helps identify sustained acceleration or deceleration patterns in disease transmission.',
    icon: 'Activity'
  },
  'acceleration': {
    label: 'Acceleration',
    description: 'The change in growth rate indicates whether an outbreak is accelerating (cases rising faster) or decelerating (cases rising slower or declining). High acceleration suggests the epidemic is gaining momentum.',
    icon: 'Zap'
  },
  'season(doy)': {
    label: 'Seasonal Pattern',
    description: 'Day of year captures seasonal variations in disease transmission. For diarrhoeal diseases, seasonality relates to monsoon patterns, agricultural cycles, water availability, temperature fluctuations, and behavioral changes throughout the year.',
    icon: 'Calendar'
  },
  'weekday(dow)': {
    label: 'Day of Week Pattern',
    description: 'Day of week patterns can reflect reporting delays, healthcare-seeking behavior, and exposure patterns. Weekend vs weekday differences may indicate workplace or school-related transmission patterns, or variations in case reporting and healthcare access.',
    icon: 'Clock'
  },
  'month_sin': {
    label: 'Seasonal Pattern (Month Sine)',
    description: 'Captures seasonal cycles in disease transmission. Many vector-borne and climate-sensitive diseases have strong seasonal patterns related to temperature, rainfall, and vector population dynamics.',
    icon: 'Calendar'
  },
  'month_cos': {
    label: 'Seasonal Pattern (Month Cosine)',
    description: 'Works with month_sin to capture the full annual cycle of disease transmission patterns. Together they encode both the phase and magnitude of seasonal variations.',
    icon: 'Calendar'
  },
  'week_sin': {
    label: 'Weekly Pattern (Sine)',
    description: 'Captures weekly cycles in case reporting and transmission. Some diseases show weekly patterns related to human behavior, reporting delays, or vector activity.',
    icon: 'Clock'
  },
  'week_cos': {
    label: 'Weekly Pattern (Cosine)',
    description: 'Works with week_sin to capture the full weekly cycle of disease activity and reporting patterns.',
    icon: 'Clock'
  },
  'Year_num': {
    label: 'Year Trend',
    description: 'Captures long-term trends in disease incidence over years. This can reflect changes in population immunity, vector populations, climate patterns, urbanization, or public health interventions.',
    icon: 'TrendingUp'
  }
};

function getFeatureMetadata(baseVar: string) {
  const metadata = FEATURE_DESCRIPTIONS[baseVar];
  if (metadata) {
    return metadata;
  }

  // Default metadata for unknown features
  return {
    label: baseVar.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: 'This climate variable influences disease outbreak patterns in the region.',
    icon: 'Info'
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const disease = searchParams.get('disease') || 'dengue';
    const limit = parseInt(searchParams.get('limit') || '8');

    console.log('Climate influence API called with disease:', disease, 'limit:', limit);

    // Map disease names to table names
    const tableMap: { [key: string]: string } = {
      dengue: 'dengue_climate_influence',
      diarrhoea: 'diarrhoea_climate_influence',
      awd: 'diarrhoea_climate_influence', // AWD and diarrhoea use the same table
      malaria_pf: 'malaria_pf_climate_influence',
      malaria_pv: 'malaria_pv_climate_influence',
    };

    const tableName = tableMap[disease];

    if (!tableName) {
      console.error('Invalid disease parameter:', disease);
      return NextResponse.json(
        { error: 'Invalid disease parameter' },
        { status: 400 }
      );
    }

    console.log('Using table:', tableName);

    // Check if table exists
    try {
      const tableCheck = await query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`,
        [tableName]
      );

      if (!tableCheck.rows[0].exists) {
        return NextResponse.json(
          { error: 'Climate influence data not available for this disease yet' },
          { status: 404 }
        );
      }
    } catch (err) {
      console.error('Error checking table existence:', err);
    }

    // Query the climate influence data, getting the best feature from each base_var
    // Use DISTINCT ON to get one feature per base_var (the one with highest abs_corr)
    // Then order by abs_corr to show most important climate factors first
    // Note: Different diseases use different naming conventions (capitalized vs lowercase)

    const qualifiedTableName = table(tableName);
    console.log('Qualified table name:', qualifiedTableName);

    const result = await query<{
      feature: string;
      base_var: string;
      lag_info: string;
      pearson_corr_with_next_week_forecast: number;
      abs_corr: number;
    }>(
      `SELECT * FROM (
        SELECT DISTINCT ON (base_var)
          feature,
          base_var,
          lag_info,
          pearson_corr_with_next_week_forecast,
          abs_corr
        FROM ${qualifiedTableName}
        WHERE (
          base_var IN ('Avg_Temperature', 'Total_Rainfall', 'Avg_Humidity')
          OR base_var IN ('temperature', 'rainfall', 'humidity')
          OR base_var IN ('average_temperature', 'total_rainfall', 'relative_humidity')
        )
          AND abs_corr IS NOT NULL
          AND abs_corr > 0
        ORDER BY base_var, abs_corr DESC
      ) AS distinct_features
      ORDER BY abs_corr DESC
      LIMIT $1`,
      [limit]
    );

    console.log('Query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      console.error('No climate influence data found in database');
      return NextResponse.json(
        { error: 'No climate influence data found' },
        { status: 404 }
      );
    }

    // Transform the data to include metadata
    const features = result.rows.map(row => {
      const metadata = getFeatureMetadata(row.base_var);
      // Convert to numbers first since pg might return them as strings
      const correlation = Number(row.pearson_corr_with_next_week_forecast);
      const absCorr = Number(row.abs_corr);

      return {
        feature: row.feature,
        baseVar: row.base_var,
        lagInfo: row.lag_info,
        correlation: parseFloat(correlation.toFixed(4)),
        absCorrelation: parseFloat(absCorr.toFixed(2)),
        label: metadata.label,
        description: metadata.description,
        icon: metadata.icon
      };
    });

    console.log('Returning features:', features.length);
    return NextResponse.json({ features });
  } catch (error) {
    console.error('Error fetching climate influence:', error);
    return NextResponse.json(
      { error: 'Failed to fetch climate influence data' },
      { status: 500 }
    );
  }
}
