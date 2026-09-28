/**
 * Kynos Raksha - Lost QR Code Recovery & Duplicate Prevention Engine
 * "ONE DOG -> ONE UNIQUE ID -> ONE QR CODE -> ONE DIGITAL HISTORY"
 * 
 * Solves the critical real-world problem:
 * If a dog loses its collar/ear tag in the field, authorized personnel can find
 * and retrieve the exact existing digital identity by matching physical traits,
 * ear-notch verification, photo comparison, and territory history—preventing
 * dangerous duplicate records and unnecessary repeated surgical/medical procedures.
 */

class DogMatcherEngine {
  constructor(stateManager) {
    this.state = stateManager;
  }

  /**
   * Compare candidate search parameters against all existing dog profiles
   * @param {Object} query - Criteria: { gender, coatColor, earNotch, ward, markings, approxAge }
   * @returns {Array} Sorted matches with score and reasoning
   */
  findMatches(query) {
    const allDogs = this.state.getDogs();
    const results = [];

    allDogs.forEach(dog => {
      let score = 0;
      let maxScore = 100;
      const matchReasons = [];

      // 1. Gender Match (25 pts)
      if (query.gender && query.gender !== 'Any') {
        if (dog.gender.toLowerCase() === query.gender.toLowerCase()) {
          score += 25;
          matchReasons.push(`Gender match: ${dog.gender}`);
        } else {
          // Gender mismatch is an instant heavy penalty
          score -= 30;
        }
      } else {
        maxScore -= 25;
      }

      // 2. Ear-Notch Verification (25 pts - crucial for sterilized community dogs)
      if (query.earNotch && query.earNotch !== 'Any') {
        const queryNotch = query.earNotch.toLowerCase();
        const dogNotch = (dog.earNotch || '').toLowerCase();
        
        if (dogNotch.includes('right') && queryNotch.includes('right')) {
          score += 25;
          matchReasons.push('Right Ear V-Notch (Male Sterilization verified)');
        } else if (dogNotch.includes('left') && queryNotch.includes('left')) {
          score += 25;
          matchReasons.push('Left Ear V-Notch (Female Sterilization verified)');
        } else if (queryNotch.includes('none') && (dogNotch.includes('none') || !dogNotch)) {
          score += 20;
          matchReasons.push('Ear-notch: Intact / None');
        } else {
          score -= 15;
        }
      } else {
        maxScore -= 25;
      }

      // 3. Coat Color (20 pts)
      if (query.coatColor && query.coatColor !== 'Any') {
        const qColor = query.coatColor.toLowerCase();
        const dColor = dog.coatColor.toLowerCase();

        if (dColor.includes(qColor) || qColor.includes(dColor)) {
          score += 20;
          matchReasons.push(`Coat color match: ${dog.coatColor}`);
        } else {
          // Partial words match
          const qWords = qColor.split(/[\s,/]+/);
          const matchedWords = qWords.filter(w => w.length > 2 && dColor.includes(w));
          if (matchedWords.length > 0) {
            score += 12;
            matchReasons.push(`Partial color tone match: ${matchedWords.join(', ')}`);
          }
        }
      } else {
        maxScore -= 20;
      }

      // 4. Territory / Ward Proximity (15 pts)
      if (query.ward && query.ward !== 'Any') {
        if (dog.ward && dog.ward.toLowerCase().includes(query.ward.toLowerCase())) {
          score += 15;
          matchReasons.push(`Ward territory match: ${dog.ward}`);
        }
      } else {
        maxScore -= 15;
      }

      // 5. Distinct Markings & Physical traits (15 pts)
      if (query.markings && query.markings.trim().length > 0) {
        const qMarkings = query.markings.toLowerCase().split(/[\s,]+/);
        const dMarkings = `${dog.distinctMarkings} ${dog.territory} ${dog.breed}`.toLowerCase();
        
        let markingHits = 0;
        qMarkings.forEach(kw => {
          if (kw.length > 2 && dMarkings.includes(kw)) {
            markingHits++;
          }
        });

        if (markingHits > 0) {
          const traitPoints = Math.min(15, markingHits * 5);
          score += traitPoints;
          matchReasons.push(`Distinct physical traits matched: ${markingHits} descriptors`);
        }
      } else {
        maxScore -= 15;
      }

      // Calculate percentage
      if (maxScore < 20) maxScore = 100; // Safeguard if user left everything blank
      const confidencePercent = Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));

      // Include in results if above baseline threshold
      if (confidencePercent >= 20 || (query.dogId && dog.id.toLowerCase().includes(query.dogId.toLowerCase()))) {
        results.push({
          dog,
          score: confidencePercent,
          matchReasons,
          isHighConfidence: confidencePercent >= 75,
          isModerateConfidence: confidencePercent >= 50 && confidencePercent < 75
        });
      }
    });

    // Sort descending by match score
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Re-issue Lost QR Tag for an identified dog
   */
  reissueLostTag(dogId, notes = "Lost tag recovered in field") {
    const dog = this.state.getDogById(dogId);
    if (!dog) throw new Error("Dog record not found");

    const activeUser = this.state.getActiveUser();
    dog.tagStatus = "Active (Re-issued)";
    dog.lastVerifiedDate = new Date().toISOString().substring(0, 10);
    
    if (!dog.auditLog) dog.auditLog = [];
    dog.auditLog.unshift({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      role: activeUser.role,
      user: activeUser.name,
      action: `Lost QR Tag Recovered & Re-issued. Identity verified without duplicating Dog ID. Note: ${notes}`
    });

    this.state.saveDog(dog);
    return dog;
  }
}

window.KynosDogMatcher = new DogMatcherEngine(window.KynosState);
