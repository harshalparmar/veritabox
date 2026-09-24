// Role hierarchy aligned with User model enum: ['Student', 'Professional', 'Recruiter', 'Teacher', 'Founder']
// Admin is a separate model (Admin collection), checked via req.user sourced from Admin.findById
export const roles = {
  ADMIN: ['Founder'],
  TEACHER: ['Teacher', 'Founder'],
  STUDENT: ['Student', 'Professional', 'Recruiter', 'Teacher', 'Founder']
};

export const permit = (allowedRoles) => {
  return (req, res, next) => {
    if (req.user && allowedRoles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden: Insufficient privileges.' });
    }
  };
};

export const requireAdmin = permit(roles.ADMIN);
export const requireTeacher = permit(roles.TEACHER);
export const requireStudent = permit(roles.STUDENT);
