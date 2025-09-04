export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  
  // Lunghezza minima
  if (password.length < 8) {
    errors.push('La password deve essere di almeno 8 caratteri');
  }
  
  // Lunghezza massima
  if (password.length > 128) {
    errors.push('La password non può superare i 128 caratteri');
  }
  
  // Almeno una lettera maiuscola
  if (!/[A-Z]/.test(password)) {
    errors.push('La password deve contenere almeno una lettera maiuscola');
  }
  
  // Almeno una lettera minuscola
  if (!/[a-z]/.test(password)) {
    errors.push('La password deve contenere almeno una lettera minuscola');
  }
  
  // Almeno un numero
  if (!/\d/.test(password)) {
    errors.push('La password deve contenere almeno un numero');
  }
  
  // Almeno un carattere speciale
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('La password deve contenere almeno un carattere speciale (!@#$%^&*...)');
  }
  
  // Non deve contenere spazi
  if (/\s/.test(password)) {
    errors.push('La password non può contenere spazi');
  }
  
  // Calcola la forza della password
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
  if (password.length >= 16) score++;
  
  if (score >= 6) strength = 'strong';
  else if (score >= 4) strength = 'medium';
  else strength = 'weak';
  
  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
}

export function getPasswordStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak': return 'text-red-600';
    case 'medium': return 'text-yellow-600';
    case 'strong': return 'text-green-600';
    default: return 'text-gray-600';
  }
}

export function getPasswordStrengthText(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak': return 'Debole';
    case 'medium': return 'Media';
    case 'strong': return 'Forte';
    default: return 'Sconosciuta';
  }
}
