/**
 * Application UI state (spec 001 T1, app layer).
 * A single mutable object shared by the shell and views — mutate properties,
 * never reassign the export. Derived data (`appData`) stays owned by the
 * shell and is passed to views as an argument.
 */

export const state = {
  view: 'overview',
  relationshipFilter: 'stale',
  mapMode: 'company',
  goals: ['AI & Technology', 'Board & Nonprofit', 'Resources'],
  careerLedgerFilter: 'all',
  objective: 'Risk, technology and governance leadership opportunities',
  selectedTopic: '',
  selectedCluster: null,
  graphNodes: [],
  aiEnabled: false
};

export const VIEW_META = {
  overview: ['Network intelligence', 'Overview'],
  network: ['Composition & concentration', 'Network map'],
  relationships: ['Attention allocation', 'Relationships'],
  lab: ['Derived relationship signals', 'Intelligence'],
  content: ['Publishing & engagement', 'Content ledger'],
  identity: ['Career narrative', 'Identity shift'],
  career: ['Job-search actions', 'Opportunity paths'],
  snapshots: ['Longitudinal analysis', 'Snapshots']
};
