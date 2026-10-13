/**
 * Kynos Raksha - Role-Based Access Control (RBAC) Module
 * Enforces strict security boundaries across UI actions, buttons, and form submissions.
 */

const ROLES = {
  PUBLIC: 'public',
  VOLUNTEER: 'volunteer',
  VET: 'vet',
  NGO: 'ngo',
  GOVT: 'govt',
  ADMIN: 'admin'
};

const PERMISSIONS = {
  // Public
  SCAN_QR: ['public', 'volunteer', 'vet', 'ngo', 'govt', 'admin'],
  VIEW_PUBLIC_INFO: ['public', 'volunteer', 'vet', 'ngo', 'govt', 'admin'],
  SUBMIT_EMERGENCY_REPORT: ['public', 'volunteer', 'vet', 'ngo', 'govt', 'admin'],
  VIEW_ADOPTIONS: ['public', 'volunteer', 'vet', 'ngo', 'govt', 'admin'],
  APPLY_ADOPTION: ['public', 'volunteer', 'vet', 'ngo', 'govt', 'admin'],
  
  // Volunteer
  UPDATE_CARE_INFO: ['volunteer', 'ngo', 'govt', 'admin'],
  SUBMIT_SIGHTING: ['volunteer', 'ngo', 'govt', 'admin'],

  // Veterinary Surgeon
  VIEW_MEDICAL_DOSSIER: ['vet', 'ngo', 'govt', 'admin'],
  ADD_DIAGNOSIS: ['vet', 'admin'],
  ADD_TREATMENT: ['vet', 'admin'],
  ADD_MEDICINE: ['vet', 'admin'],
  ADD_VACCINE: ['vet', 'ngo', 'admin'],
  LOG_STERILIZATION: ['vet', 'admin'],
  UPDATE_HEALTH_STATUS: ['vet', 'ngo', 'admin'],

  // Dog Registration & QR Issuance (Veterinarians, NGOs, Govt, Admins)
  REGISTER_DOG: ['vet', 'ngo', 'govt', 'admin'],
  GENERATE_DOG_ID: ['vet', 'ngo', 'govt', 'admin'],
  GENERATE_QR: ['vet', 'ngo', 'govt', 'admin'],
  DOWNLOAD_QR_TAG: ['vet', 'ngo', 'govt', 'admin'],
  PRINT_TAG: ['vet', 'ngo', 'govt', 'admin'],
  DISPATCH_RESCUE: ['ngo', 'admin'],
  MANAGE_ADOPTIONS: ['ngo', 'admin'],
  MANAGE_VOLUNTEERS: ['ngo', 'admin'],
  RECOVER_LOST_TAG: ['vet', 'ngo', 'govt', 'admin'],

  // Government & Municipal Officer
  VIEW_WARD_ANALYTICS: ['govt', 'admin'],
  VIEW_GIS_MAP: ['volunteer', 'vet', 'ngo', 'govt', 'admin'],
  EXPORT_MUNICIPAL_REPORT: ['govt', 'admin'],

  // Administrator
  ADMIN_PORTAL: ['admin'],
  MANAGE_USERS: ['admin'],
  AUDIT_LOGS: ['admin', 'govt'],
  RESOLVE_DUPLICATES: ['admin', 'ngo']
};

const ROLE_PERMISSIONS = {
  public: ['SCAN_QR', 'VIEW_PUBLIC_INFO', 'SUBMIT_EMERGENCY_REPORT', 'VIEW_ADOPTIONS', 'APPLY_ADOPTION'],
  volunteer: ['SCAN_QR', 'VIEW_PUBLIC_INFO', 'SUBMIT_EMERGENCY_REPORT', 'VIEW_ADOPTIONS', 'APPLY_ADOPTION', 'UPDATE_CARE_INFO', 'SUBMIT_SIGHTING', 'VIEW_GIS_MAP'],
  vet: ['SCAN_QR', 'VIEW_PUBLIC_INFO', 'SUBMIT_EMERGENCY_REPORT', 'VIEW_ADOPTIONS', 'VIEW_MEDICAL_DOSSIER', 'ADD_DIAGNOSIS', 'ADD_TREATMENT', 'ADD_MEDICINE', 'ADD_VACCINE', 'LOG_STERILIZATION', 'UPDATE_HEALTH_STATUS', 'REGISTER_DOG', 'GENERATE_DOG_ID', 'GENERATE_QR', 'DOWNLOAD_QR_TAG', 'PRINT_TAG', 'RECOVER_LOST_TAG', 'VIEW_GIS_MAP'],
  ngo: ['SCAN_QR', 'VIEW_PUBLIC_INFO', 'SUBMIT_EMERGENCY_REPORT', 'VIEW_ADOPTIONS', 'VIEW_MEDICAL_DOSSIER', 'ADD_VACCINE', 'UPDATE_HEALTH_STATUS', 'REGISTER_DOG', 'GENERATE_DOG_ID', 'GENERATE_QR', 'DOWNLOAD_QR_TAG', 'PRINT_TAG', 'DISPATCH_RESCUE', 'MANAGE_ADOPTIONS', 'MANAGE_VOLUNTEERS', 'RECOVER_LOST_TAG', 'VIEW_GIS_MAP'],
  govt: ['SCAN_QR', 'VIEW_PUBLIC_INFO', 'SUBMIT_EMERGENCY_REPORT', 'VIEW_MEDICAL_DOSSIER', 'REGISTER_DOG', 'GENERATE_DOG_ID', 'GENERATE_QR', 'DOWNLOAD_QR_TAG', 'PRINT_TAG', 'RECOVER_LOST_TAG', 'VIEW_WARD_ANALYTICS', 'VIEW_GIS_MAP', 'EXPORT_MUNICIPAL_REPORT', 'AUDIT_LOGS'],
  admin: Object.keys(PERMISSIONS)
};

class RBACManager {
  constructor(stateManager) {
    this.state = stateManager;
    this.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
  }

  getCurrentRole() {
    const user = this.state.getActiveUser();
    return user ? user.role : ROLES.PUBLIC;
  }

  hasPermission(permissionKey) {
    const currentRole = this.getCurrentRole();
    const allowedRoles = PERMISSIONS[permissionKey];
    if (!allowedRoles) return false;
    return allowedRoles.includes(currentRole);
  }

  /**
   * Enforces permissions on UI elements by data-role-req or data-perm-req attributes
   */
  applyUIConstraints() {
    const role = this.getCurrentRole();
    const user = this.state.getActiveUser();

    // Update active badge indicators in header
    const rolePills = document.querySelectorAll('.active-role-indicator');
    rolePills.forEach(el => {
      el.textContent = user.roleTitle || role.toUpperCase();
    });

    const userAvatars = document.querySelectorAll('.user-avatar-img');
    userAvatars.forEach(img => {
      if (user.avatar) img.src = user.avatar;
    });

    const userNames = document.querySelectorAll('.user-display-name');
    userNames.forEach(el => {
      el.textContent = user.name;
    });

    // Elements with data-perm
    const gatedElements = document.querySelectorAll('[data-perm]');
    gatedElements.forEach(el => {
      const requiredPerm = el.getAttribute('data-perm');
      if (this.hasPermission(requiredPerm)) {
        el.classList.remove('role-hidden');
        el.removeAttribute('disabled');
      } else {
        el.classList.add('role-hidden');
        el.setAttribute('disabled', 'true');
      }
    });

    // Elements specifically restricted with informative tooltips / alerts
    const restrictedActions = document.querySelectorAll('[data-role-guard]');
    restrictedActions.forEach(el => {
      const allowedRoles = (el.getAttribute('data-role-guard') || '').split(',').map(s => s.trim());
      if (allowedRoles.includes(role)) {
        el.classList.remove('role-disabled');
        el.removeAttribute('disabled');
        el.removeAttribute('title');
      } else {
        el.classList.add('role-disabled');
        el.setAttribute('disabled', 'true');
        el.setAttribute('title', `Action restricted. Required role: ${allowedRoles.join(' / ').toUpperCase()}`);
      }
    });

    // Dispatch custom event
    document.dispatchEvent(new CustomEvent('kynos_rbac_applied', { detail: { role, user } }));
  }
}

window.KynosRBAC = new RBACManager(window.KynosState);
