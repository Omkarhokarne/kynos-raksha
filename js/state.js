/**
 * Kynos Raksha - State Management & Persistence Layer
 * Implements LocalStorage backing with rich seed data for real-world dog identification,
 * RBAC user accounts, medical logs, incident reports, and lost tag recovery.
 */

const STORAGE_KEYS = {
  DOGS: 'kynos_dogs_v1',
  REPORTS: 'kynos_reports_v1',
  USERS: 'kynos_users_v1',
  ACTIVE_USER: 'kynos_active_user_v1',
  AUDIT_LOGS: 'kynos_audit_logs_v1',
  SETTINGS: 'kynos_settings_v1'
};

// Seed verified users matching data/users.json
const INITIAL_USERS = [
  {
    id: "USR-ADMIN-01",
    name: "Central System Administrator",
    email: "admin@kynos.org",
    password: "password123",
    role: "admin",
    userType: "admin",
    userTypeTitle: "System Administrator",
    organization: "Kynos Raksha Central Command",
    phone: "+91 11 4000 8000",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    verified: true
  },
  {
    id: "USR-NGO-01",
    name: "PAWS Welfare Trust",
    email: "ngo@kynos.org",
    password: "password123",
    role: "ngo",
    userType: "ngo",
    userTypeTitle: "Verified Animal Welfare NGO",
    organization: "PAWS Delhi Welfare Trust",
    licenseNo: "DEL-NGO-8821",
    phone: "+91 11 2654 3210",
    avatar: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=150&auto=format&fit=crop&q=80",
    verified: true
  },
  {
    id: "USR-VET-01",
    name: "Dr. Arvind Sharma",
    email: "vet@kynos.org",
    password: "password123",
    role: "vet",
    userType: "vet",
    userTypeTitle: "Verified Veterinary Surgeon",
    organization: "DL-VET Council",
    licenseNo: "DL-VET-4491",
    phone: "+91 98333 44556",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
    verified: true
  },
  {
    id: "USR-VOL-01",
    name: "Pooja Malhotra",
    email: "volunteer@kynos.org",
    password: "password123",
    role: "volunteer",
    userType: "volunteer",
    userTypeTitle: "Community Feeder & Volunteer",
    organization: "Delhi Indie Feeder Network",
    phone: "+91 98222 33445",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    verified: true
  },
  {
    id: "USR-GOV-01",
    name: "Rajesh Chandra, IAS",
    email: "govt@kynos.org",
    password: "password123",
    role: "govt",
    userType: "govt",
    userTypeTitle: "Municipal Animal Welfare Officer",
    organization: "MCD Directorate of Veterinary Services",
    phone: "+91 11 2322 1100",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    verified: true
  },
  {
    id: "USR-PUB-01",
    name: "Aarav Sharma",
    email: "citizen@kynos.org",
    password: "password123",
    role: "public",
    userType: "public",
    userTypeTitle: "Public Citizen / Dog Guardian",
    organization: "Community Resident",
    phone: "+91 98111 22334",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    verified: true
  }
];

// Default seed dogs
const INITIAL_DOGS = [
  {
    id: "KYN-DEL-2025-0012",
    name: "Sheru",
    status: "Active",
    breed: "Desi / Indian Pariah Dog",
    gender: "Male",
    approxAge: "3 Years",
    weight: "18.5 kg",
    coatColor: "Tan / Golden Brown",
    distinctMarkings: "White chest shield patch, black tip on tail, right ear V-notch",
    earNotch: "Right Ear V-Notch (Male Sterilized)",
    photo: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80",
    territory: "Hauz Khas Market & Deer Park Gate 2",
    ward: "Ward 42 - South Delhi",
    city: "New Delhi",
    lat: 28.5494,
    lng: 77.2001,
    registeredBy: "PAWS Delhi Welfare Trust",
    registrationDate: "2025-02-14",
    tagStatus: "Active", // "Active", "Reported Lost", "Re-issued"
    lastVerifiedDate: "2026-08-15",
    
    // Sterilization / ABC
    sterilization: {
      status: "Sterilized",
      date: "2025-02-20",
      facility: "MCD ABC Center, Okhla",
      surgeon: "Dr. Arvind Sharma (Reg #DL-VET-4491)",
      earNotchVerified: true,
      earNotchLocation: "Right Ear (Male)",
      postOpStatus: "Fully Healed, released to original territory"
    },

    // Vaccination
    vaccination: {
      rabiesStatus: "Active",
      lastRabiesDate: "2026-01-10",
      nextRabiesDueDate: "2027-01-10",
      rabiesBatch: "DEF-ARV-9920",
      multiVaccineStatus: "Active (DHPPiL)",
      lastMultiDate: "2025-11-05",
      nextMultiDueDate: "2026-11-05",
      history: [
        {
          vaccine: "Anti-Rabies (ARV)",
          date: "2026-01-10",
          dueDate: "2027-01-10",
          batchNo: "DEF-ARV-9920",
          administeredBy: "Dr. Neha Kapoor (Govt Poly-Clinic)",
          status: "Verified"
        },
        {
          vaccine: "7-in-1 (DHPPiL)",
          date: "2025-11-05",
          dueDate: "2026-11-05",
          batchNo: "VET-MULTI-3341",
          administeredBy: "Dr. Arvind Sharma",
          status: "Verified"
        },
        {
          vaccine: "Anti-Rabies (ARV)",
          date: "2025-02-20",
          dueDate: "2026-02-20",
          batchNo: "DEF-ARV-8104",
          administeredBy: "Dr. Arvind Sharma",
          status: "Archived"
        }
      ]
    },

    // Medical History
    medicalHistory: [
      {
        id: "MED-2026-089",
        date: "2026-05-18",
        vetName: "Dr. Arvind Sharma",
        vetReg: "DL-VET-4491",
        diagnosis: "Superficial bite wound on left flank from territorial scuffle",
        treatment: "Wound debridement, topical antiseptic spray, 3 days Cefpet syrup",
        medicines: "Cefpodoxime 100mg once daily, Meloxicam 2.5ml",
        healthStatus: "Healthy / Fully Recovered",
        followUpDate: "2026-05-25",
        notes: "Very cooperative community dog. Feeder Ramesh assisted during dressing."
      }
    ],

    // Community & Caregiver
    caregiver: {
      name: "Ramesh Kumar (Feeder) & Sunita Devi",
      role: "Community Feeder & Caregiver",
      contact: "+91 98112 34567",
      feedingSchedule: "Twice daily (07:30 AM & 08:00 PM)",
      temperament: "Friendly, gentle with children, highly responsive to name"
    },

    // Adoption
    adoption: {
      isAvailable: false,
      status: "Community Protected",
      fosterHome: "Free-roaming community resident",
      temperamentNotes: "Thrives in open park territory; deeply bonded with local shopkeepers"
    },

    auditLog: [
      { timestamp: "2025-02-14 10:30", role: "NGO", user: "PAWS Delhi", action: "Dog Registered & Tag Assigned" },
      { timestamp: "2025-02-20 16:45", role: "VET", user: "Dr. Arvind Sharma", action: "Sterilization (ABC) & Ear Notch Completed" },
      { timestamp: "2026-01-10 11:20", role: "VET", user: "Dr. Neha Kapoor", action: "Rabies Annual Booster Administered" }
    ]
  },
  {
    id: "KYN-DEL-2025-0045",
    name: "Bella",
    status: "Active",
    breed: "Desi Indie",
    gender: "Female",
    approxAge: "2 Years",
    weight: "16.0 kg",
    coatColor: "White with Light Brown Patches",
    distinctMarkings: "Brown mask around right eye, white tail tip, left ear V-notch",
    earNotch: "Left Ear V-Notch (Female Sterilized)",
    photo: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&auto=format&fit=crop&q=80",
    territory: "Defence Colony Block C Park & Metro Pillar 140",
    ward: "Ward 38 - Central Delhi",
    city: "New Delhi",
    lat: 28.5729,
    lng: 77.2340,
    registeredBy: "Friendicoes SECA",
    registrationDate: "2025-05-10",
    tagStatus: "Active",
    lastVerifiedDate: "2026-07-22",

    sterilization: {
      status: "Sterilized",
      date: "2025-06-02",
      facility: "Friendicoes Defense Colony Clinic",
      surgeon: "Dr. Ritu Verma (Reg #DL-VET-5510)",
      earNotchVerified: true,
      earNotchLocation: "Left Ear (Female)",
      postOpStatus: "Complete recovery. Healthy incision."
    },

    vaccination: {
      rabiesStatus: "Active",
      lastRabiesDate: "2026-06-01",
      nextRabiesDueDate: "2027-06-01",
      rabiesBatch: "NOBI-RAB-4411",
      multiVaccineStatus: "Active",
      lastMultiDate: "2026-06-01",
      nextMultiDueDate: "2027-06-01",
      history: [
        {
          vaccine: "Anti-Rabies (ARV)",
          date: "2026-06-01",
          dueDate: "2027-06-01",
          batchNo: "NOBI-RAB-4411",
          administeredBy: "Dr. Ritu Verma",
          status: "Verified"
        }
      ]
    },

    medicalHistory: [
      {
        id: "MED-2025-144",
        date: "2025-06-02",
        vetName: "Dr. Ritu Verma",
        vetReg: "DL-VET-5510",
        diagnosis: "Routine Sterilization (Ovariohysterectomy) and deworming",
        treatment: "Post-op meloxicam, ear-notched on left side",
        medicines: "Meloxicam drops, Albendazole dewormer",
        healthStatus: "Healthy",
        followUpDate: "2025-06-09",
        notes: "Calm disposition, recovered in shelter for 5 days before release."
      }
    ],

    caregiver: {
      name: "Meera Sen & Defense Colony RWA",
      role: "Volunteer Caregiver",
      contact: "+91 99887 76655",
      feedingSchedule: "Morning 8:00 AM at Park Boundary",
      temperament: "Docile, friendly, loves treats"
    },

    adoption: {
      isAvailable: true,
      status: "Available for Adoption",
      fosterHome: "Foster Care - Meera's Home",
      temperamentNotes: "House-trained, leash-friendly, gets along great with other indie dogs!"
    },

    auditLog: [
      { timestamp: "2025-05-10 14:00", role: "NGO", user: "Friendicoes SECA", action: "Digital Profile Created" },
      { timestamp: "2025-06-02 11:30", role: "VET", user: "Dr. Ritu Verma", action: "ABC Surgery & Left Notch Added" },
      { timestamp: "2026-06-01 10:00", role: "VET", user: "Dr. Ritu Verma", action: "Annual Rabies Vaccine Renewed" }
    ]
  },
  {
    id: "KYN-DEL-2026-0089",
    name: "Kaalu",
    status: "Active",
    breed: "Indian Hound Mix",
    gender: "Male",
    approxAge: "4 Years",
    weight: "21.0 kg",
    coatColor: "Solid Black with White Paw Socks",
    distinctMarkings: "Shiny jet black coat, white markings on both front paws, right ear V-notch",
    earNotch: "Right Ear V-Notch (Male Sterilized)",
    photo: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&auto=format&fit=crop&q=80",
    territory: "Connaught Place Inner Circle Block B",
    ward: "Ward 12 - NDMC Zone",
    city: "New Delhi",
    lat: 28.6315,
    lng: 77.2167,
    registeredBy: "NDMC Animal Welfare Wing",
    registrationDate: "2026-01-05",
    tagStatus: "Active",
    lastVerifiedDate: "2026-08-30",

    sterilization: {
      status: "Sterilized",
      date: "2024-09-12",
      facility: "NDMC Veterinary Hospital, Moti Bagh",
      surgeon: "Dr. Sandeep Malik",
      earNotchVerified: true,
      earNotchLocation: "Right Ear (Male)",
      postOpStatus: "Ear notch cleanly healed. Healthy dog."
    },

    vaccination: {
      rabiesStatus: "Due Soon", // Due within 30 days
      lastRabiesDate: "2025-10-02",
      nextRabiesDueDate: "2026-10-02",
      rabiesBatch: "RAB-IND-1002",
      multiVaccineStatus: "Overdue",
      lastMultiDate: "2024-09-12",
      nextMultiDueDate: "2025-09-12",
      history: [
        {
          vaccine: "Anti-Rabies (ARV)",
          date: "2025-10-02",
          dueDate: "2026-10-02",
          batchNo: "RAB-IND-1002",
          administeredBy: "Dr. Sandeep Malik",
          status: "Verified"
        }
      ]
    },

    medicalHistory: [
      {
        id: "MED-2026-004",
        date: "2026-01-05",
        vetName: "Dr. Sandeep Malik",
        vetReg: "DL-VET-1102",
        diagnosis: "Minor flea dermatitis and tick infestation",
        treatment: "Spot-on Fipronil application, oral Bravecto administered",
        medicines: "Fluralaner chewable 500mg",
        healthStatus: "Healthy",
        followUpDate: "2026-02-05",
        notes: "Coat fully recovered within 3 weeks. Well guarded by local traders."
      }
    ],

    caregiver: {
      name: "Gupta Traders & Taxi Stand Union",
      role: "Community Keepers",
      contact: "+91 98101 23456",
      feedingSchedule: "Afternoon 1:30 PM & Night 10:00 PM",
      temperament: "Alert guard dog, extremely loyal to area shopkeepers, safe around shoppers"
    },

    adoption: {
      isAvailable: false,
      status: "Community Protected",
      fosterHome: "Connaught Place Block B",
      temperamentNotes: "Beloved neighborhood mascot"
    },

    auditLog: [
      { timestamp: "2026-01-05 09:15", role: "GOVT", user: "NDMC Animal Welfare", action: "Official Census ID Assigned" },
      { timestamp: "2026-01-05 10:00", role: "VET", user: "Dr. Sandeep Malik", action: "Medical Dossier Transferred to Digital System" }
    ]
  },
  {
    id: "KYN-DEL-2026-0104",
    name: "Champa",
    status: "Active",
    breed: "Desi Indie",
    gender: "Female",
    approxAge: "1.5 Years",
    weight: "14.5 kg",
    coatColor: "Fawn / Light Sand",
    distinctMarkings: "Black muzzle, white star on forehead, left ear notch",
    earNotch: "Left Ear V-Notch (Female Sterilized)",
    photo: "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=600&auto=format&fit=crop&q=80",
    territory: "Lodhi Colony Block 18 & Art District",
    ward: "Ward 40 - South Central",
    city: "New Delhi",
    lat: 28.5878,
    lng: 77.2255,
    registeredBy: "People For Animals (PFA)",
    registrationDate: "2026-03-12",
    tagStatus: "Active",
    lastVerifiedDate: "2026-09-01",

    sterilization: {
      status: "Sterilized",
      date: "2026-03-15",
      facility: "PFA Shelter & ABC Hospital",
      surgeon: "Dr. Neha Kapoor",
      earNotchVerified: true,
      earNotchLocation: "Left Ear (Female)",
      postOpStatus: "Healed without complication"
    },

    vaccination: {
      rabiesStatus: "Active",
      lastRabiesDate: "2026-03-15",
      nextRabiesDueDate: "2027-03-15",
      rabiesBatch: "RAB-PFA-2026-09",
      multiVaccineStatus: "Active",
      lastMultiDate: "2026-03-15",
      nextMultiDueDate: "2027-03-15",
      history: [
        {
          vaccine: "Anti-Rabies (ARV)",
          date: "2026-03-15",
          dueDate: "2027-03-15",
          batchNo: "RAB-PFA-2026-09",
          administeredBy: "Dr. Neha Kapoor",
          status: "Verified"
        }
      ]
    },

    medicalHistory: [
      {
        id: "MED-2026-033",
        date: "2026-03-15",
        vetName: "Dr. Neha Kapoor",
        vetReg: "DL-VET-7782",
        diagnosis: "Pre-sterilization checkup, ABC surgery, dewormed",
        treatment: "Spaying done, ear-notch on left ear",
        medicines: "Post-op antibiotics and analgesics",
        healthStatus: "Healthy",
        followUpDate: "2026-03-22",
        notes: "Energetic and friendly young female indie."
      }
    ],

    caregiver: {
      name: "Lodhi Art District Feeders Collective",
      role: "Community Feeders",
      contact: "+91 97112 88990",
      feedingSchedule: "Evening 7:00 PM",
      temperament: "Playful, loves human contact, photogenic"
    },

    adoption: {
      isAvailable: true,
      status: "Available for Adoption",
      fosterHome: "Temporary Community Foster",
      temperamentNotes: "Very affectionate, socialized with tourists, ideal family pet"
    },

    auditLog: [
      { timestamp: "2026-03-12 11:00", role: "NGO", user: "PFA Delhi", action: "Dog Registered" },
      { timestamp: "2026-03-15 15:30", role: "VET", user: "Dr. Neha Kapoor", action: "Sterilization Logged" }
    ]
  },
  {
    id: "KYN-DEL-2026-0210",
    name: "Rocky",
    status: "Active",
    breed: "Indie Labrador Mix",
    gender: "Male",
    approxAge: "5 Years",
    weight: "24.0 kg",
    coatColor: "Dark Brown / Brindle",
    distinctMarkings: "White chest patch, floppy left ear, right ear notch",
    earNotch: "Right Ear V-Notch (Male Sterilized)",
    photo: "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=600&auto=format&fit=crop&q=80",
    territory: "Saket District Centre & Metro Exit 2",
    ward: "Ward 45 - South Delhi",
    city: "New Delhi",
    lat: 28.5245,
    lng: 77.2066,
    registeredBy: "PAWS Delhi Welfare Trust",
    registrationDate: "2026-04-18",
    tagStatus: "Reported Lost", // Lost tag scenario for instant test!
    lastVerifiedDate: "2026-08-10",

    sterilization: {
      status: "Sterilized",
      date: "2023-11-20",
      facility: "MCD Veterinary Hospital",
      surgeon: "Dr. Arvind Sharma",
      earNotchVerified: true,
      earNotchLocation: "Right Ear (Male)",
      postOpStatus: "Sterilized"
    },

    vaccination: {
      rabiesStatus: "Active",
      lastRabiesDate: "2025-11-20",
      nextRabiesDueDate: "2026-11-20",
      rabiesBatch: "ARV-SAK-9901",
      multiVaccineStatus: "Active",
      lastMultiDate: "2025-11-20",
      nextMultiDueDate: "2026-11-20",
      history: [
        {
          vaccine: "Anti-Rabies (ARV)",
          date: "2025-11-20",
          dueDate: "2026-11-20",
          batchNo: "ARV-SAK-9901",
          administeredBy: "Dr. Arvind Sharma",
          status: "Verified"
        }
      ]
    },

    medicalHistory: [
      {
        id: "MED-2026-112",
        date: "2026-04-18",
        vetName: "Dr. Arvind Sharma",
        vetReg: "DL-VET-4491",
        diagnosis: "Deworming and anti-tick collar fitting",
        treatment: "Administered Ivermectin, fitted with reflective QR collar",
        medicines: "Drontal Plus tablet",
        healthStatus: "Healthy",
        followUpDate: "2026-10-18",
        notes: "Tag was reportedly torn during scuffle on August 10. Tag status marked Lost."
      }
    ],

    caregiver: {
      name: "Anand Verma & Metro Security Guards",
      role: "Metro Caretaker",
      contact: "+91 98711 00223",
      feedingSchedule: "Twice daily",
      temperament: "Calm, protective, sleeps near metro entrance"
    },

    adoption: {
      isAvailable: false,
      status: "Community Protected",
      fosterHome: "Saket Metro Community Area",
      temperamentNotes: "Beloved by commuters"
    },

    auditLog: [
      { timestamp: "2026-04-18 10:00", role: "NGO", user: "PAWS Delhi", action: "Dog Registered" },
      { timestamp: "2026-08-10 17:20", role: "VOLUNTEER", user: "Anand Verma", action: "Collar Tag Reported Lost in Field" }
    ]
  }
];

// Initial emergency incident reports
const INITIAL_REPORTS = [
  {
    id: "SOS-2026-0038",
    reporterName: "Sanjay Gupta",
    reporterPhone: "+91 98450 12345",
    dogName: "Unknown Indie",
    dogId: null, // Unidentified at time of call
    locationDescription: "Under flyover near Lajpat Nagar Metro Gate 4",
    lat: 28.5700,
    lng: 77.2400,
    ward: "Ward 39 - South East",
    incidentType: "Hit-and-Run / Limping",
    severity: "High", // Critical, High, Medium, Low
    photo: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&auto=format&fit=crop&q=80",
    description: "Indie dog hit by an auto-rickshaw, bleeding from right rear leg, cannot stand. Locals have given water.",
    status: "In Treatment", // "Reported", "Dispatched", "In Treatment", "Recovered/Released", "Closed"
    timestamp: "2026-09-06 14:15",
    assignedTo: "PAWS Delhi Ambulance Unit 2",
    rescueNotes: "Picked up at 14:45. Arrived at clinic, undergoing wound cleaning and X-ray. No spinal damage."
  },
  {
    id: "SOS-2026-0032",
    reporterName: "Priya Menon",
    reporterPhone: "+91 97110 55443",
    dogName: "Sheru (Tag KYN-DEL-2025-0012)",
    dogId: "KYN-DEL-2025-0012",
    locationDescription: "Hauz Khas Village park boundary",
    lat: 28.5494,
    lng: 77.2001,
    ward: "Ward 42 - South Delhi",
    incidentType: "Skin Rash / Scratching",
    severity: "Low",
    photo: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80",
    description: "Sheru seems to have minor redness on his belly from grass irritation.",
    status: "Recovered/Released",
    timestamp: "2026-08-28 09:30",
    assignedTo: "Feeder Network Volunteer Pooja",
    rescueNotes: "Applied soothing herbal neem lotion. Cleared within 2 days."
  }
];

class StateManager {
  constructor() {
    this.initStorage();
    this.activeUser = this.getActiveUser();
    this.listeners = [];
    setTimeout(() => this.initCloudSync(), 500);
  }

  initCloudSync() {
    if (typeof window !== 'undefined' && window.KynosFirebase && window.KynosFirebase.isInitialized) {
      window.KynosFirebase.listenToDogs((cloudDogs) => {
        if (cloudDogs && cloudDogs.length > 0) {
          const localDogs = this.getDogs();
          let changed = false;
          cloudDogs.forEach(cd => {
            const idx = localDogs.findIndex(ld => ld.id === cd.id);
            if (idx >= 0) {
              localDogs[idx] = { ...localDogs[idx], ...cd };
              changed = true;
            } else {
              localDogs.unshift(cd);
              changed = true;
            }
          });
          if (changed) {
            localStorage.setItem(STORAGE_KEYS.DOGS, JSON.stringify(localDogs));
            this.notify('dogs_updated', localDogs);
          }
        }
      });
    }
  }

  initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.DOGS)) {
      localStorage.setItem(STORAGE_KEYS.DOGS, JSON.stringify(INITIAL_DOGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REPORTS)) {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(INITIAL_REPORTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_USER)) {
      // Default to Public User for safety; can be switched anytime
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(INITIAL_USERS[0]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([
        { timestamp: "2026-09-06 12:00:00", user: "System", role: "admin", action: "Kynos Raksha Engine Initialized" }
      ]));
    }
  }

  // Reactive listener pattern
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify(event, payload) {
    this.listeners.forEach(cb => cb(event, payload));
  }

  getDefaultDogPhoto(dog = {}) {
    const color = (dog.coatColor || '').toLowerCase();
    if (color.includes('black')) {
      return 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&auto=format&fit=crop&q=80';
    }
    if (color.includes('white')) {
      return 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop&q=80';
    }
    if (color.includes('brindle') || color.includes('brown')) {
      return 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=600&auto=format&fit=crop&q=80';
    }
    if (color.includes('fawn') || color.includes('sand')) {
      return 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80';
  }

  isValidPhoto(photo) {
    if (!photo || typeof photo !== 'string') return false;
    const p = photo.trim();
    return p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:image/');
  }

  // Dogs
  getDogs() {
    try {
      const dogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.DOGS)) || [];
      let updatedAny = false;
      const sanitized = dogs.map(dog => {
        if (!this.isValidPhoto(dog.photo)) {
          dog.photo = this.getDefaultDogPhoto(dog);
          updatedAny = true;
        }
        return dog;
      });
      if (updatedAny) {
        localStorage.setItem(STORAGE_KEYS.DOGS, JSON.stringify(sanitized));
      }
      return sanitized;
    } catch(e) {
      return INITIAL_DOGS;
    }
  }

  getDogById(id) {
    if (!id) return null;
    const dogs = this.getDogs();
    return dogs.find(d => d.id.trim().toUpperCase() === id.trim().toUpperCase()) || null;
  }

  saveDog(dog) {
    const dogs = this.getDogs();
    const existingIndex = dogs.findIndex(d => d.id === dog.id);
    if (existingIndex >= 0) {
      dogs[existingIndex] = dog;
    } else {
      dogs.unshift(dog);
    }
    localStorage.setItem(STORAGE_KEYS.DOGS, JSON.stringify(dogs));
    this.logAudit(this.activeUser.name, this.activeUser.role, `Updated/Saved Dog profile ${dog.id} (${dog.name})`);
    if (window.KynosFirebase) {
      window.KynosFirebase.syncDogToCloud(dog);
    }
    this.notify('dogs_updated', dog);
    return dog;
  }

  // Reports
  getReports() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS)) || [];
    } catch(e) {
      return INITIAL_REPORTS;
    }
  }

  saveReport(report) {
    const reports = this.getReports();
    const idx = reports.findIndex(r => r.id === report.id);
    if (idx >= 0) {
      reports[idx] = report;
    } else {
      reports.unshift(report);
    }
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    this.logAudit(this.activeUser.name, this.activeUser.role, `Emergency Report ${report.id} - ${report.status}`);
    if (window.KynosFirebase) {
      window.KynosFirebase.syncReportToCloud(report);
    }
    this.notify('reports_updated', report);
    return report;
  }

  // Users & Active Role
  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || INITIAL_USERS;
    } catch(e) {
      return INITIAL_USERS;
    }
  }

  getActiveUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_USER)) || INITIAL_USERS[0];
    } catch(e) {
      return INITIAL_USERS[0];
    }
  }

  setActiveUserRecord(user) {
    if (!user) return;
    // Normalize role and userType
    if (!user.role && user.userType) user.role = user.userType;
    if (!user.roleTitle && user.userTypeTitle) user.roleTitle = user.userTypeTitle;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
    this.activeUser = user;
    this.logAudit(user.name, user.role, `Logged in via database authentication as: ${user.roleTitle || user.role}`);
    if (window.KynosFirebase) {
      window.KynosFirebase.syncUserToCloud(user);
    }
    this.notify('role_changed', user);
    return user;
  }

  setActiveRole(roleKey) {
    let currentUser = this.getActiveUser();
    // Strict Role Isolation: Authenticated accounts CANNOT change their role!
    if (currentUser && currentUser.email && currentUser.email !== 'guest@kynos.org') {
      console.warn("Security Alert: Role switching is strictly prohibited. Each user has dedicated registered access rights.");
      return currentUser;
    }

    const roleTitles = {
      ngo: 'Verified Animal Welfare NGO',
      vet: 'Verified Veterinary Surgeon',
      volunteer: 'Community Volunteer & Feeder',
      govt: 'Municipal Animal Welfare Officer',
      admin: 'System Administrator',
      public: 'Public User / Citizen'
    };

    currentUser.role = roleKey;
    currentUser.userType = roleKey;
    currentUser.roleTitle = roleTitles[roleKey] || roleKey.toUpperCase();
    
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(currentUser));
    this.activeUser = currentUser;
    this.notify('role_changed', currentUser);
    return currentUser;
  }

  // Audit Logging
  getAuditLogs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) || [];
    } catch(e) {
      return [];
    }
  }

  logAudit(user, role, action) {
    const logs = this.getAuditLogs();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    logs.unshift({ timestamp: now, user, role, action });
    if (logs.length > 200) logs.pop();
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
    this.notify('audit_logged', { user, role, action, timestamp: now });
  }

  resetAllData() {
    localStorage.setItem(STORAGE_KEYS.DOGS, JSON.stringify(INITIAL_DOGS));
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(INITIAL_REPORTS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(INITIAL_USERS[0]));
    this.activeUser = INITIAL_USERS[0];
    this.logAudit("System", "admin", "System Data Reset to Standard Seeds");
    this.notify('reset', null);
  }
}

// Global singleton instance
window.KynosState = new StateManager();
