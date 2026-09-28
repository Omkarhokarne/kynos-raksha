/**
 * Kynos Raksha - Emergency & Rescue Incident Module
 * Handles citizen SOS incident submissions, GPS capture, ambulance dispatch, and case pipeline.
 */

class EmergencyManager {
  constructor(stateManager) {
    this.state = stateManager;
  }

  /**
   * Submit new citizen emergency report
   */
  submitReport(formData) {
    const activeUser = this.state.getActiveUser();
    const newId = `SOS-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const report = {
      id: newId,
      reporterName: formData.reporterName || activeUser.name,
      reporterPhone: formData.reporterPhone || activeUser.phone || "+91 99999 00000",
      dogName: formData.dogName || "Unidentified Stray",
      dogId: formData.dogId || null,
      locationDescription: formData.locationDescription || "Reported via mobile app",
      lat: parseFloat(formData.lat) || 28.5494,
      lng: parseFloat(formData.lng) || 77.2001,
      ward: formData.ward || "Ward 42 - South Delhi",
      incidentType: formData.incidentType || "Injured / Limping",
      severity: formData.severity || "High",
      photo: formData.photo || "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&auto=format&fit=crop&q=80",
      description: formData.description || "Urgent assistance requested.",
      status: "Reported", // Initial status
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      assignedTo: "Pending NGO Assignment",
      rescueNotes: "Report logged into central dispatch queue."
    };

    this.state.saveReport(report);
    return report;
  }

  /**
   * Update status of an incident report
   */
  updateReportStatus(reportId, newStatus, assignedUnit, notes) {
    const reports = this.state.getReports();
    const report = reports.find(r => r.id === reportId);
    if (!report) throw new Error("Report not found");

    report.status = newStatus;
    if (assignedUnit) report.assignedTo = assignedUnit;
    if (notes) report.rescueNotes = notes;

    this.state.saveReport(report);
    return report;
  }

  /**
   * Fetch device geolocation helper
   */
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            // Default to central Delhi coordinates if denied or unavailable
            resolve({ lat: 28.5494, lng: 77.2001, fallback: true });
          },
          { timeout: 8000 }
        );
      }
    });
  }
}

window.KynosEmergency = new EmergencyManager(window.KynosState);
