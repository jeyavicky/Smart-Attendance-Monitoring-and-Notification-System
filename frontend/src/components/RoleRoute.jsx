import React from 'react';
import ProtectedRoute from './ProtectedRoute';

export default function RoleRoute({ roles, children }) {
  return <ProtectedRoute allowedRoles={roles}>{children}</ProtectedRoute>;
}
