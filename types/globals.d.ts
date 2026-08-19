declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: "admin" | "member" | "viewer";
    };
  }
}

export {};
