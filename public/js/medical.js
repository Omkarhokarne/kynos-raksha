/**
 * Kynos Raksha - Medical & Veterinary Records Module
 * Handles clinical diagnoses, vaccination tracking with batch numbers,
 * ABC sterilization tracking, and health status indicators.
 */

class MedicalManager {
  constructor(stateManager) {
    this.state = stateManager;
  }

  /**
   * Calculate vaccine status badge
   */
  calculateVaccineStatus(dueDateStr) {
    if (!dueDateStr) return { label: "Not Logged", class: "status-gray" };

    const today = new Date();
    const dueDate = new Date(dueDateStr);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Overdue by ${Math.abs(diffDays)} days`, class: "status-danger", isOverdue: true };
    } else if (diffDays <= 30) {
      return { label: `Due in ${diffDays} days`, class: "status-warning", isDueSoon: true };
    } else {
      return { label: `Valid until ${dueDateStr}`, class: "status-success", isValid: true };
    }
  }

  /**
   * Log new vaccination record for a dog
   */
  addVaccination(dogId, vaccineData) {
    const dog = this.state.getDogById(dogId);
    if (!dog) throw new Error("Dog not found");

    const activeUser = this.state.getActiveUser();
    if (!dog.vaccination) {
      dog.vaccination = { history: [] };
    }

    const adminDate = vaccineData.date || new Date().toISOString().substring(0, 10);
    // Standard booster: 1 year from administration date
    const d = new Date(adminDate);
    d.setFullYear(d.getFullYear() + 1);
    const dueDate = vaccineData.dueDate || d.toISOString().substring(0, 10);

    const record = {
      vaccine: vaccineData.vaccine || "Anti-Rabies (ARV)",
      date: adminDate,
      dueDate: dueDate,
      batchNo: vaccineData.batchNo || `BATCH-${Date.now().toString().slice(-6)}`,
      administeredBy: activeUser.name + (activeUser.licenseNo ? ` (${activeUser.licenseNo})` : ''),
      status: "Verified",
      notes: vaccineData.notes || ""
    };

    if (vaccineData.vaccine.toLowerCase().includes('rabies') || vaccineData.vaccine.toLowerCase().includes('arv')) {
      dog.vaccination.rabiesStatus = "Active";
      dog.vaccination.lastRabiesDate = adminDate;
      dog.vaccination.nextRabiesDueDate = dueDate;
      dog.vaccination.rabiesBatch = record.batchNo;
    } else {
      dog.vaccination.multiVaccineStatus = "Active";
      dog.vaccination.lastMultiDate = adminDate;
      dog.vaccination.nextMultiDueDate = dueDate;
    }

    dog.vaccination.history.unshift(record);
    dog.lastVerifiedDate = adminDate;

    this.state.saveDog(dog);
    return dog;
  }

  /**
   * Add clinical diagnosis and treatment
   */
  addDiagnosis(dogId, clinicalData) {
    const dog = this.state.getDogById(dogId);
    if (!dog) throw new Error("Dog not found");

    const activeUser = this.state.getActiveUser();
    if (!dog.medicalHistory) dog.medicalHistory = [];

    const visit = {
      id: `MED-${Date.now().toString().slice(-6)}`,
      date: clinicalData.date || new Date().toISOString().substring(0, 10),
      vetName: activeUser.name,
      vetReg: activeUser.licenseNo || "Verified NGO/Staff",
      diagnosis: clinicalData.diagnosis,
      treatment: clinicalData.treatment,
      medicines: clinicalData.medicines || "None prescribed",
      healthStatus: clinicalData.healthStatus || "Healthy",
      followUpDate: clinicalData.followUpDate || "None",
      notes: clinicalData.notes || ""
    };

    dog.medicalHistory.unshift(visit);
    dog.lastVerifiedDate = visit.date;

    this.state.saveDog(dog);
    return dog;
  }

  /**
   * Log ABC Sterilization with Ear-Notch Verification
   */
  logSterilization(dogId, sterilData) {
    const dog = this.state.getDogById(dogId);
    if (!dog) throw new Error("Dog not found");

    const activeUser = this.state.getActiveUser();
    const surgeryDate = sterilData.date || new Date().toISOString().substring(0, 10);

    // Standard ABC protocol: Male = Right ear V-notch; Female = Left ear V-notch
    let defaultNotch = dog.gender === 'Female' 
      ? 'Left Ear V-Notch (Female Sterilized)' 
      : 'Right Ear V-Notch (Male Sterilized)';
    
    dog.sterilization = {
      status: "Sterilized",
      date: surgeryDate,
      facility: sterilData.facility || "ABC Animal Care Center",
      surgeon: activeUser.name + (activeUser.licenseNo ? ` (${activeUser.licenseNo})` : ''),
      earNotchVerified: true,
      earNotchLocation: sterilData.earNotchLocation || defaultNotch,
      postOpStatus: sterilData.postOpStatus || "Healthy, observed for 4 days post-op"
    };

    dog.earNotch = dog.sterilization.earNotchLocation;
    dog.lastVerifiedDate = surgeryDate;

    this.state.saveDog(dog);
    return dog;
  }
}

window.KynosMedical = new MedicalManager(window.KynosState);
