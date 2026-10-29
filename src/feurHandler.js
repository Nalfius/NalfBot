/**
 * Module de transformation "quoi" -> "feur"
 * Applique une série de règles pour transformer les messages contenant "quoi"
 * 
 * Règles appliquées dans l'ordre de priorité :
 * 1. Règles spécifiques (pourquoi, pour quoi, tu + verbe en f, sujets + verbe en f)
 * 2. Règles de suffixe (XXX-quoi)
 * 3. Règle générale (remplacement simple de "quoi")
 * 
 * La règle générale ne s'applique QUE si aucune règle spécifique ne s'est appliquée.
 */

/**
 * Helper pour préserver la casse lors du remplacement
 * @param {string} original - Le texte original capturé
 * @param {string} replacement - Le texte de remplacement en minuscules
 * @returns {string} - Le remplacement avec la bonne casse
 */
function preserveCase(original, replacement) {
  if (!original || original.length === 0) {
    return replacement.toLowerCase();
  }
  
  // Vérifier si tout est en majuscules (au moins 2 caractères)
  const isAllUpperCase = original.length > 1 && 
    original === original.toUpperCase() && 
    /^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÝÇÆŒ]+$/.test(original);
  
  if (isAllUpperCase) {
    return replacement.toUpperCase();
  }
  
  // Vérifier si la première lettre est majuscule
  const firstChar = original.charAt(0);
  const isFirstUpper = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
  
  if (isFirstUpper) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
  }
  
  return replacement.toLowerCase();
}

/**
 * Règles de transformation, appliquées dans l'ordre de priorité.
 * Chaque règle a :
 * - pattern: Regex pour matcher le message (INSENSIBLE à la casse avec flag /i)
 * - replace: Fonction qui reçoit le match et retourne le remplacement avec la CASSE PRÉSERVÉE
 */
const rules = [
  // 1. Règles spécifiques avec mots-clés avant "quoi" (priorité la plus haute)
  {
    name: 'pourquoi -> Pour feur',
    pattern: /(pourquoi)/gi,
    replace: (match, p1) => {
      return preserveCase(p1, 'pour feur');
    }
  },
  {
    name: 'pour quoi -> Pour feur',
    pattern: /(pour) (quoi)/gi,
    replace: (match, p1, p2) => {
      return preserveCase(p1, 'pour') + ' ' + preserveCase(p2, 'feur');
    }
  },
  {
    name: 'tu + [mot en f] + quoi',
    pattern: /(?<=\s|^)(tu)(\s+)(f\S*)(\s+)(quoi)(?=\s*[\?\!\.]?|$)/gi,
    replace: (match, p1, p2, p3, p4, p5) => {
      const newSubject = preserveCase(p1, 'je');
      const newWhat = preserveCase(p5, 'feur');
      return newSubject + p2 + p3 + p4 + newWhat;
    }
  },
  {
    name: 'il/elle/on/ça/y/iels/... + [mot en f] + quoi',
    pattern: /(?<=\s|^)(il|elle|on|ça|y|iels|iel|elles|ils)(\s+)(f\S*)(\s+)(quoi)(?=\s*[\?\!\.]?|$)/gi,
    replace: (match, p1, p2, p3, p4, p5) => {
      let subject = p1;
      if (subject.toLowerCase() === 'y') {
        subject = 'Il';
      } else if (subject.toLowerCase() === 'ça') {
        subject = 'Ça';
      } else {
        subject = preserveCase(subject, subject.toLowerCase());
      }
      const newWhat = preserveCase(p5, 'feur');
      return subject + p2 + p3 + p4 + newWhat;
    }
  },
  
  // 2. Règles de transformation de suffixe (priorité moyenne)
  {
    name: 'suffixe -quoi',
    pattern: /(\w+\s+)?([a-zA-Zàâäéèêëïîôùûüÿæœç\-]+)-(quoi)([\?\!\.]?)/gi,
    replace: (match, p1, p2, p3, p4) => {
      const prefix = p1 || '';
      const middle = p2;
      const what = p3;
      const suffix = p4 || '';
      return prefix + middle + '-' + preserveCase(what, 'feur') + suffix;
    }
  },
  
  // 3. Règle générale : remplacement simple de "quoi" (priorité la plus basse)
  // NE S'APPLIQUE QUE si aucune autre règle ne s'est déclenchée
  {
    name: 'remplacement simple',
    pattern: /\b(quoi)\b/gi,
    replace: (match, p1) => {
      return preserveCase(p1, 'feur');
    }
  }
];

/**
 * Applique une règle spécifique avec la logique de contexte
 */
function applyRuleWithContext(result, rule, ruleIndex) {
  const regex = new RegExp(rule.pattern, rule.flags);
  const match = regex.exec(result);
  
  if (!match) {
    return result;
  }
  
  const matchStart = match.index;
  const matchEnd = matchStart + match[0].length;
  const hasPrefix = matchStart > 0;
  const hasSuffix = matchEnd < result.length;
  
  let transformedPart = match[0].replace(regex, rule.replace);
  
  // Si il y a du contexte avant OU après, retourner SEULEMENT la partie transformée
  if (hasPrefix || hasSuffix) {
    // Vérifier si le contexte après est UNIQUEMENT de la ponctuation
    const suffix = result.slice(matchEnd);
    const isOnlyPunctuation = /^\s*[\?\!\.]$/.test(suffix);
    
    // Appliquer la règle pair/impaire pour décider si on garde le contexte après
    if (ruleIndex % 2 === 0) {
      // Règle paire: retourner seulement la partie transformée (sans contexte)
      return transformedPart;
    } else {
      // Règle impaire: si le suffixe est UNIQUEMENT de la ponctuation, garder le contexte, sinon supprimer
      if (isOnlyPunctuation && !hasPrefix) {
        return result.replace(regex, rule.replace);
      } else {
        return transformedPart;
      }
    }
  }
  
  // Pas de contexte: appliquer la règle pair/impaire
  if (ruleIndex % 2 === 0) {
    // Règle paire: retourner seulement la partie transformée
    return transformedPart;
  } else {
    // Règle impaire: remplacer le message complet
    return result.replace(regex, rule.replace);
  }
}

/**
 * Applique toutes les règles de transformation à un message.
 * Chaque règle ne s'applique qu'une fois (première occurrence).
 * La règle générale ne s'applique QUE si aucune règle précédente ne s'est appliquée.
 * 
 * @param {string} message - Le message à transformer
 * @returns {string|null} - Le message transformé, ou null si aucune règle ne s'applique
 */
function transformMessage(message) {
  let result = message;
  let hasChanged = false;
  let specificRuleMatched = false;

  // Appliquer les règles 0-4 (règles spécifiques) de manière itérative
  // On continue jusqu'à ce qu'il n'y ait plus de match pour les règles 0-4
  let changed;
  do {
    changed = false;
    for (let i = 0; i < rules.length - 1; i++) {
      const rule = rules[i];
      const regex = new RegExp(rule.pattern, rule.flags);
      const match = regex.exec(result);
      
      if (match) {
        specificRuleMatched = true;
        const newResult = applyRuleWithContext(result, rule, i);
        if (newResult !== result) {
          result = newResult;
          changed = true;
          hasChanged = true;
          break; // Recommencer depuis la première règle après une modification
        }
      }
    }
  } while (changed);

  // Appliquer la règle 5 (remplacement simple) si aucune règle spécifique n'a matché
  if (!specificRuleMatched) {
    const generalRule = rules[rules.length - 1];
    const generalRegex = new RegExp(generalRule.pattern, generalRule.flags);
    const hasMatch = generalRegex.test(result);
    
    if (hasMatch) {
      result = result.replace(generalRegex, generalRule.replace);
      hasChanged = true;
    }
  }
  
  if (hasChanged) {
    return result;
  }
  
  return null;
}

/**
 * Vérifie si un message doit déclencher une réponse feur
 * @param {string} message - Le message à vérifier
 * @returns {boolean} - true si le message contient "quoi"
 */
function shouldRespond(message) {
  return /\s*quoi\b/i.test(message);
}

/**
 * Répond "feur" au message Discord s'il contient "quoi"
 * @param {import('discord.js').Message} msg - Le message Discord
 * @returns {boolean} - true si le message a été traité
 */
function handle(msg) {
  if (!shouldRespond(msg.content)) {
    return false;
  }
  const response = transformMessage(msg.content);
  if (!response) {
    return false;
  }
  msg.reply(response);
  return true;
}

module.exports = {
  handle,
  transformMessage,
  shouldRespond,
  rules,
  preserveCase
};
