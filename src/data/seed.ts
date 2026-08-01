// src/data/seed.ts
//
// Drop-in seed data for HoagieFunctions. Self-contained: the types live here too,
// so you can use this file as-is. If you prefer, move the interfaces into src/types.ts
// and change the imports; nothing else needs to change.
//
// Coordinates: eating clubs + Frist, Firestone, Nassau Hall, McCormick (Art Museum)
// are exact (NRHP records). Residential colleges and a few academic buildings are
// placed to sit correctly on campus and marked APPROX. Nudge those if you want pixel
// precision, but they land in believable spots on the Leaflet map.

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type ClassYear = 2026 | 2027 | 2028 | 2029;

export type FillName =
  | 'neutral' | 'blue' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'purple' | 'indigo';

export type AccessType = 'open' | 'rsvp' | 'guestlist';
export type HostType = 'club' | 'eatingClub' | 'individual';
export type ClubKind = 'club' | 'eatingClub';
export type MemberStatus = 'member' | 'pending';
export type ApplicantStatus = 'pending' | 'approved' | 'auto';

/**
 * Who the event is POSTED TO (who can discover it). Separate from accessType,
 * which is how you join. Absent = 'everyone'.
 *  - 'club'   → only confirmed members of that club (e.g. a Terrace-only post)
 *  - 'people' → only the specific people invited by name
 */
export type EventAudience =
  | { kind: 'everyone' }
  | { kind: 'club'; clubId: string }
  | { kind: 'people'; userIds: string[] };

export interface ClubMembership {
  clubId: string;
  status: MemberStatus;
}

export interface Application {
  eventId: string;
  status: ApplicantStatus;
}

export interface User {
  id: string;
  name: string;
  classYear: ClassYear;
  avatarColor: string;       // hex, used for the initials avatar
  eatingClubId?: string;     // the eating club whose badge they hold
  clubMemberships: ClubMembership[];
  adminOf: string[];         // clubIds this user can post for / approve into
  rsvps: string[];           // eventIds
  applications: Application[];
}

export interface Club {
  id: string;
  name: string;
  kind: ClubKind;
  colorFill: FillName;
  description: string;
  adminIds: string[];
  memberIds: string[];
  pendingIds: string[];      // users awaiting admin approval
}

export interface Building {
  id: string;
  name: string;
  // Optional: an ad-hoc location the user didn't place on the map has no coords,
  // so the UI shows its name but no map.
  lat?: number;
  lng?: number;
}

export interface Tag {
  id: string;
  label: string;
  colorFill: FillName;
}

export interface EventApplicant {
  userId: string;
  status: ApplicantStatus;
}

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  hostType: HostType;
  hostId: string;            // clubId (club/eatingClub) or userId (individual)
  hostName: string;
  buildingId: string;
  start: string;             // ISO
  end: string;               // ISO
  accessType: AccessType;
  audience?: EventAudience;  // who can see it; absent = everyone
  tags: string[];            // tagIds
  reservationConfirmed: boolean;
  attendeeIds: string[];
  applicants: EventApplicant[];
  capacity?: number;
  checkedInIds?: string[];   // attendees checked in at the door (admin/host tool)
}

// ----------------------------------------------------------------------------
// Date helper - events are seeded relative to "now" so the demo never goes stale
// ----------------------------------------------------------------------------

/**
 * ISO timestamp for `days` after the START OF THE DEMO WEEK, at hh:mm (local).
 * Day 0 is the coming Sunday (today if it's already Sunday), so the whole feed
 * runs Sunday → the following Sunday no matter which day you open it.
 */
const at = (days: number, hh: number, mm = 0): string => {
  const d = new Date();
  const daysUntilSunday = (7 - d.getDay()) % 7; // 0 if today is Sunday
  d.setDate(d.getDate() + daysUntilSunday + days);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
};

// ----------------------------------------------------------------------------
// Tags
// ----------------------------------------------------------------------------

export const tags: Tag[] = [
  { id: 't-party',     label: 'Party',          colorFill: 'indigo'  },
  { id: 't-dorm',      label: 'Dorm Party',     colorFill: 'orange'  },
  { id: 't-pregame',   label: 'Pregame',        colorFill: 'red'     },
  { id: 't-listening', label: 'Listening Party', colorFill: 'blue'   },
  { id: 't-games',     label: 'Poker / Games',  colorFill: 'red'     },
  { id: 't-info',      label: 'Info Session',   colorFill: 'teal'    },
  { id: 't-gbm',       label: 'GBM',            colorFill: 'neutral' },
  { id: 't-freefood',  label: 'Free Food',      colorFill: 'green'   },
  { id: 't-formal',    label: 'Formal',         colorFill: 'blue'    },
  { id: 't-study',     label: 'Study',          colorFill: 'yellow'  },
  { id: 't-athletics', label: 'Athletics',      colorFill: 'orange'  },
  { id: 't-arts',      label: 'Arts',           colorFill: 'teal'    },
  { id: 't-open',      label: 'Open Invite',    colorFill: 'green'   },
];

// ----------------------------------------------------------------------------
// Buildings (Princeton, NJ)
// ----------------------------------------------------------------------------

export const buildings: Building[] = [
  // Eating clubs - exact (NRHP)
  { id: 'b-terrace',   name: 'Terrace Club',            lat: 40.347167, lng: -74.653972 },
  { id: 'b-cottage',   name: 'University Cottage Club', lat: 40.348250, lng: -74.651500 }, // APPROX (51 Prospect)
  { id: 'b-cannon',    name: 'Cannon Dial Elm Club',    lat: 40.347944, lng: -74.653389 }, // APPROX (21 Prospect)
  { id: 'b-tiger-inn', name: 'Tiger Inn',               lat: 40.348556, lng: -74.651750 }, // APPROX (48 Prospect)
  { id: 'b-ivy',       name: 'Ivy Club',                lat: 40.348167, lng: -74.652222 },
  { id: 'b-colonial',  name: 'Colonial Club',           lat: 40.348833, lng: -74.652806 },
  { id: 'b-tower',     name: 'Tower Club',              lat: 40.347694, lng: -74.653972 },
  { id: 'b-quad',      name: 'Quadrangle Club',         lat: 40.348000, lng: -74.652722 },
  { id: 'b-cap',       name: 'Cap & Gown Club',         lat: 40.348306, lng: -74.651000 },
  { id: 'b-charter',   name: 'Charter Club',            lat: 40.348472, lng: -74.650056 }, // APPROX (79 Prospect)
  { id: 'b-cloister',  name: 'Cloister Inn',            lat: 40.348389, lng: -74.650750 }, // APPROX (65 Prospect)

  // Campus buildings - Frist/Firestone/Nassau/McCormick exact, rest APPROX
  { id: 'b-frist',           name: 'Frist Campus Center',   lat: 40.346889, lng: -74.655278 },
  { id: 'b-firestone',       name: 'Firestone Library',     lat: 40.349417, lng: -74.657472 },
  { id: 'b-nassau',          name: 'Nassau Hall',           lat: 40.348739, lng: -74.659350 },
  { id: 'b-mccormick',       name: 'McCormick Hall',        lat: 40.347194, lng: -74.658028 },
  { id: 'b-robertson',       name: 'Robertson Hall (SPIA)', lat: 40.348889, lng: -74.656944 }, // APPROX
  { id: 'b-mccosh',          name: 'McCosh Hall',           lat: 40.348300, lng: -74.657200 }, // APPROX
  { id: 'b-lewis',           name: 'Lewis Library',         lat: 40.346139, lng: -74.654583 }, // APPROX
  { id: 'b-dillon',          name: 'Dillon Gymnasium',      lat: 40.346333, lng: -74.658083 }, // APPROX
  { id: 'b-whitman',         name: 'Whitman College',       lat: 40.344806, lng: -74.657222 }, // APPROX
  { id: 'b-butler',          name: 'Butler College',        lat: 40.344500, lng: -74.654500 }, // APPROX
  { id: 'b-prospect-house',  name: 'Prospect House',        lat: 40.346000, lng: -74.654700 }, // APPROX

  // Dorms (for dorm parties) - APPROX
  { id: 'b-blair',           name: 'Blair Hall',            lat: 40.348870, lng: -74.659760 }, // APPROX
  { id: 'b-1901',            name: '1901 Hall',             lat: 40.344700, lng: -74.655600 }, // APPROX
];

// ----------------------------------------------------------------------------
// Clubs (regular clubs + eating clubs)
// ----------------------------------------------------------------------------

export const clubs: Club[] = [
  {
    id: 'terrace',
    name: 'Terrace Club',
    kind: 'eatingClub',
    colorFill: 'green',
    description: 'Sign-in eating club on Washington Road. The artsy one on the Street.',
    adminIds: ['u-theo'],
    memberIds: ['u-arsh', 'u-theo', 'u-priya', 'u-sam', 'u-chloe', 'u-diego'],
    pendingIds: [],
  },
  {
    id: 'cottage',
    name: 'University Cottage Club',
    kind: 'eatingClub',
    colorFill: 'blue',
    description: 'One of the Big Four bicker clubs. Georgian mansion at 51 Prospect.',
    adminIds: ['u-lena'],
    memberIds: ['u-lena', 'u-nina', 'u-omar', 'u-hana'],
    pendingIds: [],
  },
  {
    id: 'cannon',
    name: 'Cannon Dial Elm Club',
    kind: 'eatingClub',
    colorFill: 'red',
    description: 'Bicker club known for a packed social calendar.',
    adminIds: ['u-devin'],
    memberIds: ['u-devin', 'u-maya', 'u-marcus', 'u-aisha'],
    pendingIds: [],
  },
  {
    id: 'tiger-inn',
    name: 'Tiger Inn',
    kind: 'eatingClub',
    colorFill: 'orange',
    description: 'The Glorious Tiger Inn. Oldest clubhouse on the Street.',
    adminIds: ['u-sam'],
    memberIds: ['u-sam', 'u-jordan', 'u-riley'],
    pendingIds: [],
  },
  {
    id: 'e-club',
    name: 'Hoagie Club',
    kind: 'club',
    colorFill: 'indigo',
    description: 'The team building Hoagie - students shipping the campus software everyone uses.',
    adminIds: ['u-arsh'],            // <-- current user is admin here (post + approve demo)
    memberIds: ['u-arsh', 'u-maya', 'u-priya', 'u-marcus', 'u-chloe', 'u-omar'],
    pendingIds: ['u-theo', 'u-nina'], // <-- two pending requests to approve in the demo
  },
  {
    id: 'ttt',
    name: 'Table Tennis Club',
    kind: 'club',
    colorFill: 'teal',
    description: 'Casual and competitive play, all skill levels welcome.',
    adminIds: ['u-devin'],
    memberIds: ['u-devin', 'u-sam'],
    pendingIds: [],
  },
  {
    id: 'collective',
    name: 'Nassau Sound Collective',
    kind: 'club',
    colorFill: 'yellow',
    description: 'Student musicians running open mics and listening sessions.',
    adminIds: ['u-maya'],
    memberIds: ['u-maya', 'u-lena'],
    pendingIds: [],
  },
  {
    id: 'debate',
    name: 'Princeton Debate Panel',
    kind: 'club',
    colorFill: 'red',
    description: 'Competitive parli and public debate - and the dorm gatherings that come with it.',
    adminIds: ['u-priya'],
    memberIds: ['u-priya', 'u-theo'],
    pendingIds: [],
  },
];

// ----------------------------------------------------------------------------
// Users
// ----------------------------------------------------------------------------

export const users: User[] = [
  {
    id: 'u-arsh',
    name: 'Arsh Parekh',
    classYear: 2028,
    avatarColor: '#0EA5E9',
    eatingClubId: 'terrace',                     // holds the Terrace badge -> auto-accept
    clubMemberships: [
      { clubId: 'terrace', status: 'member' },
      { clubId: 'e-club',  status: 'member' },
    ],
    adminOf: ['e-club'],
    rsvps: ['ev-brent-faiyaz', 'ev-eclub-gbm'],   // gives the "For You" feed some signal
    applications: [],
  },
  { id: 'u-maya',  name: 'Maya Chen',      classYear: 2027, avatarColor: '#DE7548',
    eatingClubId: 'cannon',
    clubMemberships: [{ clubId: 'cannon', status: 'member' }, { clubId: 'e-club', status: 'member' }, { clubId: 'collective', status: 'member' }],
    adminOf: ['collective'], rsvps: [], applications: [] },
  { id: 'u-devin', name: 'Devin Okafor',   classYear: 2026, avatarColor: '#52BD95',
    eatingClubId: 'cannon',
    clubMemberships: [{ clubId: 'cannon', status: 'member' }, { clubId: 'ttt', status: 'member' }],
    adminOf: ['cannon', 'ttt'], rsvps: [], applications: [] },
  { id: 'u-priya', name: 'Priya Nair',     classYear: 2028, avatarColor: '#3366FF',
    eatingClubId: 'terrace',
    clubMemberships: [{ clubId: 'terrace', status: 'member' }, { clubId: 'e-club', status: 'member' }, { clubId: 'debate', status: 'member' }],
    adminOf: ['debate'], rsvps: [], applications: [] },
  { id: 'u-sam',   name: 'Sam Rivera',     classYear: 2027, avatarColor: '#FFB020',
    eatingClubId: 'tiger-inn',
    clubMemberships: [{ clubId: 'tiger-inn', status: 'member' }, { clubId: 'terrace', status: 'member' }, { clubId: 'ttt', status: 'member' }],
    adminOf: ['tiger-inn'], rsvps: [], applications: [] },
  { id: 'u-lena',  name: 'Lena Fischer',   classYear: 2026, avatarColor: '#D14343',
    eatingClubId: 'cottage',
    clubMemberships: [{ clubId: 'cottage', status: 'member' }, { clubId: 'collective', status: 'member' }],
    adminOf: ['cottage'], rsvps: [], applications: [] },
  { id: 'u-theo',  name: 'Theo Alvarez',   classYear: 2029, avatarColor: '#0F5156',
    eatingClubId: 'terrace',
    clubMemberships: [{ clubId: 'terrace', status: 'member' }, { clubId: 'e-club', status: 'pending' }, { clubId: 'debate', status: 'member' }],
    adminOf: ['terrace'], rsvps: [], applications: [] },
  { id: 'u-nina',  name: 'Nina Park',      classYear: 2029, avatarColor: '#0D9488',
    eatingClubId: 'cottage',
    clubMemberships: [{ clubId: 'cottage', status: 'member' }, { clubId: 'e-club', status: 'pending' }],
    adminOf: [], rsvps: [], applications: [] },
  { id: 'u-marcus', name: 'Marcus Lee',    classYear: 2027, avatarColor: '#E8562C',
    eatingClubId: 'cannon',
    clubMemberships: [{ clubId: 'cannon', status: 'member' }, { clubId: 'e-club', status: 'member' }],
    adminOf: [], rsvps: [], applications: [] },
  { id: 'u-chloe', name: 'Chloe Nguyen',   classYear: 2028, avatarColor: '#2CA6A4',
    eatingClubId: 'terrace',
    clubMemberships: [{ clubId: 'terrace', status: 'member' }, { clubId: 'e-club', status: 'member' }],
    adminOf: [], rsvps: [], applications: [] },
  { id: 'u-omar',  name: 'Omar Haddad',    classYear: 2026, avatarColor: '#3B6FE0',
    eatingClubId: 'cottage',
    clubMemberships: [{ clubId: 'cottage', status: 'member' }, { clubId: 'e-club', status: 'member' }],
    adminOf: [], rsvps: [], applications: [] },
  { id: 'u-jordan', name: 'Jordan Blake',  classYear: 2029, avatarColor: '#C2410C',
    eatingClubId: 'tiger-inn',
    clubMemberships: [{ clubId: 'tiger-inn', status: 'member' }],
    adminOf: [], rsvps: [], applications: [] },
  { id: 'u-aisha', name: 'Aisha Rahman',   classYear: 2027, avatarColor: '#16A34A',
    eatingClubId: 'cannon',
    clubMemberships: [{ clubId: 'cannon', status: 'member' }],
    adminOf: [], rsvps: [], applications: [] },
  { id: 'u-diego', name: 'Diego Ramos',    classYear: 2028, avatarColor: '#2563EB',
    eatingClubId: 'terrace',
    clubMemberships: [{ clubId: 'terrace', status: 'member' }],
    adminOf: [], rsvps: [], applications: [] },
  { id: 'u-hana',  name: 'Hana Sato',      classYear: 2029, avatarColor: '#0891B2',
    eatingClubId: 'cottage',
    clubMemberships: [{ clubId: 'cottage', status: 'member' }],
    adminOf: [], rsvps: [], applications: [] },
  { id: 'u-riley', name: 'Riley Morgan',   classYear: 2026, avatarColor: '#CA8A04',
    eatingClubId: 'tiger-inn',
    clubMemberships: [{ clubId: 'tiger-inn', status: 'member' }],
    adminOf: [], rsvps: [], applications: [] },
];

/** The seeded logged-in user. No real auth in the demo - everyone lands as Arsh. */
export const CURRENT_USER_ID = 'u-arsh';

// ----------------------------------------------------------------------------
// Events (14) - spread across today / this week / upcoming, all access types,
// all three host types, several reservation-locked spaces for the conflict demo.
// ----------------------------------------------------------------------------

export const events: CampusEvent[] = [
  // --- The auto-accept beat: Arsh holds the Terrace badge, so requesting = instant in ---
  {
    id: 'ev-terrace-pregame',
    title: 'Terrace Lawnparties Pregame',
    description: 'Members and guests only. Live DJ on the back lawn before we head out. Bring your badge.',
    hostType: 'eatingClub', hostId: 'terrace', hostName: 'Terrace Club',
    buildingId: 'b-terrace',
    start: at(0, 21, 0), end: at(0, 23, 59),
    accessType: 'guestlist',
    tags: ['t-pregame', 't-party'],
    reservationConfirmed: true,
    attendeeIds: ['u-priya', 'u-sam', 'u-theo', 'u-chloe', 'u-diego', 'u-marcus', 'u-aisha', 'u-riley'],
    applicants: [
      { userId: 'u-priya', status: 'approved' },
      { userId: 'u-maya',  status: 'pending' }, // a real pending request an admin can approve
    ],
    capacity: 200,
  },

  // --- Contrast: a Guestlist event where Arsh is NOT a member -> stays pending ---
  {
    id: 'ev-cottage-formal',
    title: 'Cottage Semi-Formal',
    description: 'Black tie optional. Members and approved guests. Dinner, then dancing in the tap room.',
    hostType: 'eatingClub', hostId: 'cottage', hostName: 'University Cottage Club',
    buildingId: 'b-cottage',
    start: at(3, 20, 0), end: at(3, 23, 30),
    accessType: 'guestlist',
    tags: ['t-formal', 't-party'],
    reservationConfirmed: true,
    attendeeIds: ['u-lena', 'u-nina', 'u-omar', 'u-hana', 'u-diego'],
    applicants: [],
    capacity: 150,
  },

  // --- Individual-hosted listening party (the "anyone can post" story) ---
  {
    id: 'ev-brent-faiyaz',
    title: 'Brent Faiyaz Listening Party',
    description: 'Wasteland front to back on a real sound system. Floor cushions, low lights, no talking during the deep cuts.',
    hostType: 'individual', hostId: 'u-maya', hostName: 'Maya Chen',
    buildingId: 'b-frist',
    start: at(0, 20, 0), end: at(0, 22, 0),
    accessType: 'rsvp',
    tags: ['t-listening', 't-arts'],
    reservationConfirmed: false,
    attendeeIds: ['u-arsh', 'u-priya', 'u-sam', 'u-chloe', 'u-marcus', 'u-diego', 'u-hana'],
    applicants: [],
    capacity: 40,
  },

  // --- Individual-hosted poker night: invite-only (only named people see it) ---
  {
    id: 'ev-poker',
    title: '2AM Poker Night',
    description: 'Low-stakes cash game. Eight seats, first come first serve. Snacks provided, bring your own luck.',
    hostType: 'individual', hostId: 'u-devin', hostName: 'Devin Okafor',
    buildingId: 'b-butler',
    start: at(1, 23, 30), end: at(2, 2, 0),
    accessType: 'guestlist',
    audience: { kind: 'people', userIds: ['u-sam', 'u-priya', 'u-arsh'] },
    tags: ['t-games'],
    reservationConfirmed: false,
    attendeeIds: ['u-devin', 'u-sam'],
    applicants: [{ userId: 'u-priya', status: 'pending' }],
    capacity: 8,
  },

  // --- Club GBM hosted by Arsh's club (he's admin) ---
  {
    id: 'ev-eclub-gbm',
    title: 'Hoagie Club GBM + Free Pizza',
    description: 'Kicking off the semester: what we are shipping this term, office hours, and a lot of pizza.',
    hostType: 'club', hostId: 'e-club', hostName: 'Hoagie Club',
    buildingId: 'b-robertson',
    start: at(2, 18, 0), end: at(2, 19, 30),
    accessType: 'rsvp',
    tags: ['t-gbm', 't-freefood', 't-info'],
    reservationConfirmed: true,
    attendeeIds: ['u-arsh', 'u-maya', 'u-priya', 'u-marcus', 'u-chloe', 'u-omar', 'u-aisha'],
    applicants: [],
    capacity: 80,
  },

  {
    id: 'ev-cos-study',
    title: 'COS 217 Study Jam',
    description: 'Grinding the assembly assignment together. Whiteboards, chargers, and moral support.',
    hostType: 'individual', hostId: 'u-priya', hostName: 'Priya Nair',
    buildingId: 'b-lewis',
    start: at(2, 15, 0), end: at(2, 18, 0),
    accessType: 'open',
    tags: ['t-study'],
    reservationConfirmed: false,
    attendeeIds: ['u-priya'],
    applicants: [],
  },

  {
    id: 'ev-ttt-play',
    title: 'Table Tennis Open Play',
    description: 'All paddles, all levels. Round-robin ladder if enough people show. Beginners genuinely welcome.',
    hostType: 'club', hostId: 'ttt', hostName: 'Table Tennis Club',
    buildingId: 'b-dillon',
    start: at(4, 19, 0), end: at(4, 21, 0),
    accessType: 'open',
    tags: ['t-athletics', 't-open'],
    reservationConfirmed: true,
    attendeeIds: ['u-devin', 'u-sam', 'u-jordan', 'u-riley', 'u-marcus'],
    applicants: [],
  },

  {
    id: 'ev-open-mic',
    title: 'Open Mic Night',
    description: 'Sign up at the door. Original songs, covers, spoken word, whatever you have got. Five minute sets.',
    hostType: 'club', hostId: 'collective', hostName: 'Nassau Sound Collective',
    buildingId: 'b-frist',
    start: at(5, 20, 0), end: at(5, 22, 0),
    accessType: 'rsvp',
    tags: ['t-arts', 't-listening'],
    reservationConfirmed: false,
    attendeeIds: ['u-maya', 'u-lena', 'u-chloe', 'u-hana', 'u-diego'],
    applicants: [],
    capacity: 60,
  },

  {
    id: 'ev-cannon-info',
    title: 'Cannon Bicker Info Night',
    description: 'Curious about bicker? Meet members, tour the house, ask the awkward questions. Open to all.',
    hostType: 'eatingClub', hostId: 'cannon', hostName: 'Cannon Dial Elm Club',
    buildingId: 'b-cannon',
    start: at(2, 21, 0), end: at(2, 22, 30),
    accessType: 'open',
    tags: ['t-info', 't-party'],
    reservationConfirmed: false,
    attendeeIds: ['u-devin', 'u-maya', 'u-marcus', 'u-aisha'],
    applicants: [],
  },

  {
    id: 'ev-ti-karaoke',
    title: 'Tiger Inn Karaoke Night',
    description: 'The taproom, a screen, and questionable song choices. Members plus guestlist.',
    hostType: 'eatingClub', hostId: 'tiger-inn', hostName: 'Tiger Inn',
    buildingId: 'b-tiger-inn',
    start: at(6, 22, 0), end: at(7, 1, 0),
    accessType: 'guestlist',
    tags: ['t-party'],
    reservationConfirmed: true,
    attendeeIds: ['u-sam', 'u-jordan', 'u-riley', 'u-diego', 'u-hana'],
    applicants: [],
    capacity: 120,
  },

  {
    id: 'ev-firestone-study',
    title: 'Firestone Late Night',
    description: 'Silent co-working until they kick us out. Trees floor, come and go as you please.',
    hostType: 'individual', hostId: 'u-sam', hostName: 'Sam Rivera',
    buildingId: 'b-firestone',
    start: at(1, 21, 0), end: at(1, 23, 59),
    accessType: 'open',
    tags: ['t-study'],
    reservationConfirmed: false,
    attendeeIds: ['u-sam', 'u-priya', 'u-diego', 'u-hana'],
    applicants: [],
  },

  {
    id: 'ev-terrace-jazz',
    title: 'Terrace Jazz Night',
    description: 'Live student combo in the front room. Members only - a quieter night just for the club.',
    hostType: 'eatingClub', hostId: 'terrace', hostName: 'Terrace Club',
    buildingId: 'b-terrace',
    start: at(7, 20, 0), end: at(7, 22, 30),
    accessType: 'guestlist',                 // another Terrace guestlist -> also auto-accepts Arsh
    audience: { kind: 'club', clubId: 'terrace' }, // only Terrace members can see it
    tags: ['t-arts', 't-listening'],
    reservationConfirmed: true,
    attendeeIds: ['u-theo', 'u-priya', 'u-chloe', 'u-diego'],
    applicants: [],
    capacity: 100,
  },

  {
    id: 'ev-cannon-neon',
    title: 'Cannon Neon Party',
    description: 'Glow paint at the door, two rooms, one theme. Members plus guestlist, wear white.',
    hostType: 'eatingClub', hostId: 'cannon', hostName: 'Cannon Dial Elm Club',
    buildingId: 'b-cannon',
    start: at(5, 22, 0), end: at(6, 1, 0),
    accessType: 'guestlist',
    tags: ['t-party', 't-pregame'],
    reservationConfirmed: true,
    attendeeIds: ['u-devin', 'u-maya', 'u-marcus', 'u-aisha', 'u-jordan'],
    applicants: [],
    capacity: 180,
  },

  {
    id: 'ev-spia-chat',
    title: 'SPIA Coffee Chat',
    description: 'Informal chat with juniors about the policy task force and summer funding. Coffee on us.',
    hostType: 'individual', hostId: 'u-lena', hostName: 'Lena Fischer',
    buildingId: 'b-prospect-house',
    start: at(3, 16, 0), end: at(3, 17, 0),
    accessType: 'open',
    tags: ['t-info'],
    reservationConfirmed: false,
    attendeeIds: ['u-lena'],
    applicants: [],
  },

  // --- Dorm parties: club-hosted gatherings in the dorms that flow to the Street ---
  {
    id: 'ev-debate-dorm',
    title: 'Debate Panel Dorm Party',
    description: 'The Panel takes over a Blair common room. Start the night in the dorms, then head to the Street together around midnight.',
    hostType: 'club', hostId: 'debate', hostName: 'Princeton Debate Panel',
    buildingId: 'b-blair',
    start: at(0, 22, 0), end: at(1, 0, 30),
    accessType: 'open',
    tags: ['t-dorm', 't-pregame'],
    reservationConfirmed: false,
    attendeeIds: ['u-priya', 'u-theo', 'u-aisha', 'u-diego', 'u-hana'],
    applicants: [],
  },
  {
    id: 'ev-collective-dorm',
    title: 'Sound Collective Dorm Session',
    description: 'A low-key dorm gathering in 1901 - records, friends, and a warm-up before wherever the night goes.',
    hostType: 'club', hostId: 'collective', hostName: 'Nassau Sound Collective',
    buildingId: 'b-1901',
    start: at(5, 22, 30), end: at(6, 1, 0),
    accessType: 'rsvp',
    tags: ['t-dorm', 't-party'],
    reservationConfirmed: false,
    attendeeIds: ['u-maya', 'u-lena', 'u-chloe', 'u-hana', 'u-omar'],
    applicants: [],
    capacity: 50,
  },
];

// ----------------------------------------------------------------------------
// Filler students - a big background crowd so events feel full. They have no
// club memberships and aren't admins (not "clickable" anywhere special); they
// just show up in attendee stacks and are invitable when creating an event.
// ----------------------------------------------------------------------------

const FILLER_FIRST = [
  'Ava', 'Liam', 'Noah', 'Emma', 'Olivia', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'Lucas',
  'Mia', 'Aiden', 'Charlotte', 'Caleb', 'Amelia', 'Elijah', 'Harper', 'Wren', 'Evelyn', 'Cole',
  'Ella', 'Henry', 'Grace', 'Sebastian', 'Zara', 'Jack', 'Nora', 'Owen', 'Lily', 'Leo',
  'Zoe', 'Nathan', 'Hannah', 'Rhea', 'Layla', 'Adrian', 'Aria', 'Julian', 'Simone', 'Miles',
  'Naomi', 'Isaac', 'Ruby', 'Kai', 'Stella', 'Wyatt', 'Vera', 'Xavier', 'Hazel', 'Jonah',
];
const FILLER_LAST = [
  'Kim', 'Patel', 'Nguyen', 'Garcia', 'Cohen', 'Silva', 'Wang', 'Ali', 'Rossi', 'Mbeki',
  'Brooks', 'Reyes', 'Haas', 'Ito', 'Novak', 'Diallo', 'Park', 'Costa', 'Singh', 'Flynn',
  'Adeyemi', 'Watts', 'Cruz', 'Bauer', 'Oni', 'Frost', 'Vega', 'Malik', 'Doyle', 'Sato',
  'Roy', 'Klein', 'Abara', 'Mora', 'Tan', 'Ford',
];
// Non-pink avatar colors only (pink is the app theme).
const FILLER_COLORS = [
  '#0EA5E9', '#F59E0B', '#059669', '#2563EB', '#DC2626', '#0891B2', '#CA8A04', '#16A34A',
  '#0D9488', '#EA580C', '#4F46E5', '#0F766E', '#B45309', '#334155',
];
const FILLER_YEARS: ClassYear[] = [2026, 2027, 2028, 2029];
const FILLER_COUNT = 180;

const fillerUsers: User[] = Array.from({ length: FILLER_COUNT }, (_, i) => ({
  id: `u-f${i + 1}`,
  name: `${FILLER_FIRST[i % FILLER_FIRST.length]} ${FILLER_LAST[(i * 13) % FILLER_LAST.length]}`,
  classYear: FILLER_YEARS[i % FILLER_YEARS.length],
  avatarColor: FILLER_COLORS[i % FILLER_COLORS.length],
  clubMemberships: [],
  adminOf: [],
  rsvps: [],
  applications: [],
}));
users.push(...fillerUsers);

// Fill each event to a healthy majority of its capacity - higher for events
// coming up soon. Invite-only events are left exclusive.
const fillerIds = fillerUsers.map((u) => u.id);
events.forEach((ev, ei) => {
  if (ev.audience?.kind === 'people') return;
  const soon = (new Date(ev.start).getTime() - Date.now()) / 86_400_000 < 7;
  const factor = soon ? 0.9 : 0.78;
  const target = ev.capacity ? Math.round(ev.capacity * factor) : soon ? 46 : 32;
  const offset = (ei * 29) % fillerIds.length;
  for (let k = 0; k < fillerIds.length && ev.attendeeIds.length < target; k++) {
    const fid = fillerIds[(offset + k) % fillerIds.length];
    if (!ev.attendeeIds.includes(fid)) ev.attendeeIds.push(fid);
  }
});

// ----------------------------------------------------------------------------
// Convenience lookups (optional, handy in the store)
// ----------------------------------------------------------------------------

export const buildingById = Object.fromEntries(buildings.map((b) => [b.id, b]));
export const clubById = Object.fromEntries(clubs.map((c) => [c.id, c]));
export const tagById = Object.fromEntries(tags.map((t) => [t.id, t]));
export const userById = Object.fromEntries(users.map((u) => [u.id, u]));

/** Everything the store needs to (re)initialize a clean demo. */
export const seed = { users, clubs, buildings, tags, events, CURRENT_USER_ID };
export default seed;
