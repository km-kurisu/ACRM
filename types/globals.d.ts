declare global {
  namespace CustomJwtSessionClaims {
    interface Metadata {
      role?: "admin" | "member" | "viewer";
    }
  }
}

export {};
