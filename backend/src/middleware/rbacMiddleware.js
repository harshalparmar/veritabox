export const roles = {
  ADMIN: ['Admin', 'Founder'],
  TEACHER: ['Teacher', 'Faculty', 'Admin', 'Founder'],
  STUDENT: ['Student', 'Member', 'Intern', 'Core Developer', 'Team Lead', 'Teacher', 'Faculty', 'Admin', 'Founder']
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
