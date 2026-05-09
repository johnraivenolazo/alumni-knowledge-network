// GICS-aligned sector taxonomy. Sub-industries are intentionally curated rather
// than mirroring the full GICS hierarchy — they cover the categories alumni
// in this network are most likely to self-identify with, while keeping the
// dropdown short enough to scan visually.

export interface GicsSector {
	sector: string;
	subIndustries: string[];
}

export const GICS_SECTORS: GicsSector[] = [
	{
		sector: 'Information Technology',
		subIndustries: [
			'Software',
			'Hardware',
			'Semiconductors',
			'IT Services',
			'Cybersecurity',
			'Data & Analytics',
			'Cloud Infrastructure'
		]
	},
	{
		sector: 'Health Care',
		subIndustries: [
			'Pharmaceuticals',
			'Biotechnology',
			'Hospitals & Clinics',
			'Medical Devices',
			'Health Care Services',
			'Life Sciences Tools'
		]
	},
	{
		sector: 'Financials',
		subIndustries: [
			'Banking',
			'Investment Services',
			'Insurance',
			'Real Estate Investment Trusts',
			'Capital Markets',
			'Consumer Finance'
		]
	},
	{
		sector: 'Consumer Discretionary',
		subIndustries: [
			'Retail',
			'Media',
			'Hospitality',
			'Apparel',
			'Automotive',
			'Leisure Products',
			'Restaurants'
		]
	},
	{
		sector: 'Communication Services',
		subIndustries: [
			'Telecommunications',
			'Entertainment',
			'Interactive Media',
			'Publishing',
			'Advertising',
			'Movies & Broadcasting'
		]
	},
	{
		sector: 'Industrials',
		subIndustries: [
			'Aerospace',
			'Defense',
			'Machinery',
			'Construction',
			'Transportation',
			'Logistics',
			'Engineering Services'
		]
	},
	{
		sector: 'Consumer Staples',
		subIndustries: [
			'Food & Beverage',
			'Household Goods',
			'Personal Products',
			'Tobacco',
			'Food Retail',
			'Agricultural Products'
		]
	},
	{
		sector: 'Energy',
		subIndustries: [
			'Oil & Gas Exploration',
			'Oil & Gas Refining',
			'Consumable Fuels',
			'Energy Equipment',
			'Renewable Energy'
		]
	},
	{
		sector: 'Utilities',
		subIndustries: [
			'Electric Utilities',
			'Gas Utilities',
			'Water Utilities',
			'Multi-Utilities',
			'Independent Power Producers'
		]
	},
	{
		sector: 'Real Estate',
		subIndustries: [
			'Commercial Real Estate',
			'Residential Real Estate',
			'Property Management',
			'Real Estate Development',
			'Real Estate Services'
		]
	},
	{
		sector: 'Materials',
		subIndustries: [
			'Mining',
			'Metals',
			'Chemicals',
			'Forestry & Paper',
			'Construction Materials',
			'Containers & Packaging'
		]
	}
];

export interface GicsOption {
	sector: string;
	subIndustry: string;
	// "Sector — Sub-Industry", which is what we persist in the DB so that
	// querying by sector still works while preserving the granular pick.
	value: string;
}

export const GICS_OPTIONS: GicsOption[] = GICS_SECTORS.flatMap((s) =>
	s.subIndustries.map((sub) => ({
		sector: s.sector,
		subIndustry: sub,
		value: `${s.sector} — ${sub}`
	}))
);