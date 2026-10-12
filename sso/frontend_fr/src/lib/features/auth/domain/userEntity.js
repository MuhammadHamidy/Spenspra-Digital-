export class UserEntity {
  constructor({
    id,
    username,
    fullName,
    roleName,
    email,
    nimNip,
    phone,
    hasFace,
    courseNames = [],
    courseIds = [],
    classCodes = [],
    classIds = [],
    className = '',
    photoUrl = '',
  }) {
    this.id = id;
    this.username = username;
    this.fullName = fullName;
    this.roleName = roleName;
    this.email = email;
    this.nimNip = nimNip;
    this.phone = phone;
    this.hasFace = hasFace || false;
    this.courseNames = courseNames;
    this.courseIds = courseIds;
    this.classCodes = classCodes;
    this.classIds = classIds;
    this.className = className;
    this.photoUrl = photoUrl;
    // Keep snake_case aliases for compatibility
    this.course_names = courseNames;
    this.course_ids = courseIds;
    this.class_codes = classCodes;
    this.class_ids = classIds;
    this.class_name = className;
    this.photo_url = photoUrl;
  }

  isAdmin() {
    return ['ADMIN', 'SUPER_ADMIN', 'ADMIN_RAPOR', 'ADMIN_PERPUS', 'ADMIN_ABSENSI'].includes(this.roleName);
  }

  isDosen() {
    return this.roleName === 'DOSEN' || this.roleName === 'GURU';
  }

  isMahasiswa() {
    return this.roleName === 'MAHASISWA' || this.roleName === 'SISWA';
  }
}
