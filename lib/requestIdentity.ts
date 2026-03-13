type RequestIdentity = {
  email: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function getRequestIdentity(request: Request): RequestIdentity | null {
  const rawEmail = request.headers.get('x-user-email');
  if (!rawEmail) {
    return null;
  }

  const email = normalizeEmail(rawEmail);
  if (!email || !email.includes('@')) {
    return null;
  }

  return { email };
}

