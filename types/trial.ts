export interface ClinicalTrial {
  protocolSection: ProtocolSection;
  derivedSection?: DerivedSection;
  hasResults?: boolean;
}

export interface ProtocolSection {
  identificationModule: IdentificationModule;
  statusModule: StatusModule;
  sponsorCollaboratorsModule: SponsorCollaboratorsModule;
  descriptionModule?: DescriptionModule;
  conditionsModule?: ConditionsModule;
  designModule?: DesignModule;
  armsInterventionsModule?: ArmsInterventionsModule;
  outcomesModule?: OutcomesModule;
  eligibilityModule?: EligibilityModule;
  contactsLocationsModule?: ContactsLocationsModule;
}

export interface IdentificationModule {
  nctId: string;
  briefTitle: string;
  officialTitle?: string;
  acronym?: string;
}

export interface StatusModule {
  overallStatus: string;
  startDateStruct?: { date: string; type: string };
  primaryCompletionDateStruct?: { date: string; type: string };
  completionDateStruct?: { date: string; type: string };
  statusVerifiedDate?: string;
  lastUpdatePostDateStruct?: { date: string; type: string };
}

export interface SponsorCollaboratorsModule {
  leadSponsor: { name: string; class: string };
  collaborators?: Array<{ name: string; class: string }>;
  responsibleParty?: {
    type: string;
    investigatorFullName?: string;
    investigatorTitle?: string;
    investigatorAffiliation?: string;
  };
}

export interface DescriptionModule {
  briefSummary?: string;
  detailedDescription?: string;
}

export interface ConditionsModule {
  conditions?: string[];
  keywords?: string[];
}

export interface DesignModule {
  studyType: string;
  phases?: string[];
  designInfo?: {
    allocation?: string;
    interventionModel?: string;
    primaryPurpose?: string;
    maskingInfo?: { masking: string; whoMasked?: string[] };
  };
  enrollmentInfo?: { count: number; type: string };
}

export interface ArmsInterventionsModule {
  armGroups?: Array<{
    label: string;
    type?: string;
    description?: string;
    interventionNames?: string[];
  }>;
  interventions?: Array<{
    type: string;
    name: string;
    description?: string;
    armGroupLabels?: string[];
    otherNames?: string[];
  }>;
}

export interface OutcomesModule {
  primaryOutcomes?: Array<{ measure: string; description?: string; timeFrame?: string }>;
  secondaryOutcomes?: Array<{ measure: string; description?: string; timeFrame?: string }>;
}

export interface EligibilityModule {
  eligibilityCriteria?: string;
  healthyVolunteers?: boolean;
  sex?: string;
  minimumAge?: string;
  maximumAge?: string;
  stdAges?: string[];
}

export interface ContactsLocationsModule {
  locations?: Array<{
    facility?: string;
    status?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    contacts?: Array<{ name?: string; role?: string; phone?: string; email?: string }>;
  }>;
  overallOfficials?: Array<{ name?: string; affiliation?: string; role?: string }>;
  centralContacts?: Array<{ name?: string; role?: string; phone?: string; email?: string }>;
}

export interface DerivedSection {
  conditionBrowseModule?: {
    meshes?: Array<{ id: string; term: string }>;
    browseLeaves?: Array<{ id: string; name: string; asFound?: string; relevance: string }>;
  };
  interventionBrowseModule?: {
    meshes?: Array<{ id: string; term: string }>;
    browseLeaves?: Array<{ id: string; name: string; asFound?: string; relevance: string }>;
  };
}

export interface SearchResponse {
  studies: ClinicalTrial[];
  nextPageToken?: string;
  totalCount?: number;
}
