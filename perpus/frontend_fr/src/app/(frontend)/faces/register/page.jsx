'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Modal,
  StyledTextField,
  MuiSelectField,
  MuiAlertSnackbar,
} from '@/components/mui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PrintIcon from '@mui/icons-material/Print';
import BadgeIcon from '@mui/icons-material/Badge';
import SchoolIcon from '@mui/icons-material/School';
import SaveIcon from '@mui/icons-material/Save';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

import FaceCameraCapture from '@/components/FaceCameraCapture';
import { faceApiAdapter } from '@/lib/features/faces/infrastructure/faceApiAdapter';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';
import { useRoleGuard } from '@/lib/features/auth/presentation/useRoleGuard';

export default function RegisterFacePage() {
  const { isAuthorized, loading: authLoading } = useRoleGuard(['ADMIN', 'GURU']);

  const [capturedData, setCapturedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [photoInputMode, setPhotoInputMode] = useState('upload'); // 'upload' | 'camera'
  const [isExtractingEmb, setIsExtractingEmb] = useState(false);
  const [classList, setClassList] = useState([]);

  // Imported Students List State
  const [importedStudents, setImportedStudents] = useState([]);
  const [selectedImportedStudentId, setSelectedImportedStudentId] = useState('');
  const [csvRawInput, setCsvRawInput] = useState(
    `0089281701, Ahmad Rizky Pratama, Kelas VII-A\n0089281702, Budi Santoso, Kelas VII-A\n0089281703, Citra Lestari, Kelas VIII-A\n0089281704, Dian Kurniawan, Kelas IX-A`
  );

  // Form State
  const [studentForm, setStudentForm] = useState({
    name: '',
    nisn: '',
    classCode: 'Kelas VII-A',
  });

  // Saved Card Result State
  const [savedStudentCard, setSavedStudentCard] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('smprambon_imported_students');
      if (saved) {
        setImportedStudents(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load imported students:', e);
    }

    async function loadClasses() {
      try {
        const data = await classApiAdapter.getAll();
        if (data && data.length > 0) {
          setClassList(data);
          setStudentForm((prev) => ({
            ...prev,
            classCode: data[0].class_code || data[0].name || 'Kelas VII-A',
          }));
        }
      } catch {
        // Fallback default options
      }
    }
    loadClasses();
  }, []);

  const handleSelectImportedStudent = (e) => {
    const stId = e.target.value;
    setSelectedImportedStudentId(stId);
    if (!stId) return;

    const found = importedStudents.find((st) => String(st.id) === String(stId));
    if (found) {
      setStudentForm({
        name: found.name,
        nisn: found.nisn,
        classCode: found.classCode || 'Kelas VII-A',
      });
      setSnackbar({
        open: true,
        message: `Data ${found.name} berhasil dipilih. Silakan unggah foto siswa.`,
        severity: 'info',
      });
    }
  };

  const handleProcessCsvImport = async (e) => {
    e.preventDefault();
    if (!csvRawInput.trim()) return;

    const lines = csvRawInput.split('\n');
    const parsedList = [];

    lines.forEach((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      if (
        index === 0 &&
        (cleanLine.toLowerCase().includes('nisn') || cleanLine.toLowerCase().includes('nama'))
      )
        return;

      const parts = cleanLine.split(/,|\t|;/).map((p) => p.trim());
      if (parts.length >= 2) {
        const nisn = parts[0];
        const name = parts[1];
        const classCode = parts[2]
          ? parts[2].startsWith('Kelas')
            ? parts[2]
            : `Kelas ${parts[2]}`
          : 'Kelas VII-A';

        parsedList.push({
          id: `IMP-${Date.now()}-${index}`,
          nisn,
          name,
          classCode,
        });
      }
    });

    if (parsedList.length === 0) {
      setErrorMsg('Format CSV tidak valid. Gunakan format: NISN, Nama Lengkap, Rombel Kelas');
      return;
    }

    const merged = [...parsedList, ...importedStudents];
    setImportedStudents(merged);
    try {
      localStorage.setItem('smprambon_imported_students', JSON.stringify(merged));
    } catch (err) {
      console.warn('Storage save notice:', err);
    }

    setSelectedImportedStudentId(parsedList[0].id);
    setStudentForm({
      name: parsedList[0].name,
      nisn: parsedList[0].nisn,
      classCode: parsedList[0].classCode,
    });

    setIsImportModalOpen(false);
    setSnackbar({
      open: true,
      message: `Berhasil mengimpor ${parsedList.length} data siswa!`,
      severity: 'success',
    });
  };

  const processFacePhoto = async (base64DataUrl) => {
    setErrorMsg(null);
    setUploadPreview(base64DataUrl);
    setIsExtractingEmb(true);

    try {
      const { extractFaceEmbeddingFromPhoto } = await import(
        '@/lib/features/faces/infrastructure/faceApiAdapter'
      );
      const embResult = await extractFaceEmbeddingFromPhoto(base64DataUrl);
      if (embResult.success && embResult.embedding.length > 0) {
        setCapturedData({ photoUrl: base64DataUrl, faceVector: embResult.embedding });
        setSnackbar({
          open: true,
          message: 'Wajah terdeteksi! Vektor biometrik 128-D berhasil diekstraksi.',
          severity: 'success',
        });
      } else {
        setErrorMsg(
          `⚠️ ${embResult.message || 'Wajah tidak terdeteksi pada foto ini.'}. Pastikan wajah terlihat jelas, tidak tertutup, dan pencahayaan memadai.`
        );
        setCapturedData(null);
      }
    } catch (err) {
      setCapturedData({ photoUrl: base64DataUrl, faceVector: [] });
    } finally {
      setIsExtractingEmb(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Format file tidak valid. Harap pilih file gambar (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Ukuran file terlalu besar. Maksimal 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      await processFacePhoto(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = async (base64Photo) => {
    await processFacePhoto(base64Photo);
  };

  const handleSaveStudentRegistration = async (e) => {
    e.preventDefault();

    if (!capturedData || !capturedData.photoUrl) {
      setErrorMsg('Harap upload foto wajah siswa terlebih dahulu.');
      return;
    }

    if (!studentForm.name.trim() || !studentForm.nisn.trim()) {
      setErrorMsg('Harap lengkapi semua bidang formulir (Nama Lengkap dan NISN Siswa).');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      let faceVector = capturedData.faceVector;
      if (!faceVector || faceVector.length !== 128) {
        try {
          const { extractFaceEmbeddingFromPhoto } = await import(
            '@/lib/features/faces/infrastructure/faceApiAdapter'
          );
          const embResult = await extractFaceEmbeddingFromPhoto(capturedData.photoUrl);
          if (embResult.success && embResult.embedding.length > 0) {
            faceVector = embResult.embedding;
          } else if (embResult.message) {
            setErrorMsg(`⚠️ ${embResult.message}. Pastikan wajah terlihat jelas pada foto.`);
            setLoading(false);
            return;
          }
        } catch (embErr) {
          console.warn('Face service extraction notice:', embErr);
        }
      }

      await faceApiAdapter.registerFace({
        userId: studentForm.nisn,
        fullName: studentForm.name,
        nim: studentForm.nisn,
        photoUrl: capturedData.photoUrl,
        faceVector,
      });

      const targetClass = classList.find(
        (c) =>
          c.class_code === studentForm.classCode ||
          c.id === studentForm.classCode ||
          c.name === studentForm.classCode
      );
      if (targetClass?.id) {
        try {
          await classApiAdapter.enrollStudent(targetClass.id, studentForm.nisn);
        } catch (enrollErr) {
          console.warn('Auto-enrollment notice:', enrollErr.message);
        }
      }

      const cardData = {
        id: `STD-${Date.now()}`,
        name: studentForm.name,
        nisn: studentForm.nisn,
        classCode: studentForm.classCode,
        photoUrl: capturedData.photoUrl,
        registeredAt: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      };

      setSavedStudentCard(cardData);
      setIsSuccessModalOpen(true);
      setSnackbar({
        open: true,
        message: `Data siswa ${studentForm.name} dan sampel wajah berhasil disimpan!`,
        severity: 'success',
      });
    } catch (err) {
      setErrorMsg(
        err.response?.data?.error || err.message || 'Gagal menyimpan registrasi wajah siswa.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setCapturedData(null);
    setUploadPreview(null);
    setPhotoInputMode('upload');
    setStudentForm({ name: '', nisn: '', classCode: 'Kelas VII-A' });
    setSavedStudentCard(null);
    setErrorMsg(null);
    setIsSuccessModalOpen(false);
  };

  if (authLoading || !isAuthorized) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <CircularProgress size={36} sx={{ color: '#1A3D63' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <FaceRetouchingNaturalIcon sx={{ color: '#1A3D63', fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0A1931', letterSpacing: '-0.02em' }}>
              Registrasi Wajah & Identitas Siswa
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#4A7FA7' }}>
            Impor data massal atau daftarkan identitas siswa baru, lalu unggah foto sampel wajah AI presensi.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            startIcon={<FileUploadIcon sx={{ fontSize: 18 }} />}
          >
            Impor CSV / Excel
          </Button>
          {(capturedData || studentForm.name || studentForm.nisn) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetForm}
              startIcon={<RestartAltIcon sx={{ fontSize: 18 }} />}
            >
              Reset Form
            </Button>
          )}
        </Stack>
      </Box>

      {errorMsg && (
        <Alert
          severity="error"
          onClose={() => setErrorMsg(null)}
          sx={{ borderRadius: 2.5, fontWeight: 600, border: '1px solid #FDA4AF' }}
        >
          {errorMsg}
        </Alert>
      )}

      {/* Main Registration Grid Layout */}
      <form onSubmit={handleSaveStudentRegistration}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' },
            gap: 3,
            alignItems: 'start',
          }}
        >
          {/* LEFT COLUMN: PHOTO UPLOAD */}
          <Card title="Langkah 1: Foto Wajah Siswa">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="body2" sx={{ color: '#4A7FA7', lineHeight: 1.6 }}>
                Pilih metode input foto wajah siswa: unggah berkas pas foto atau ambil langsung menggunakan kamera. Sistem akan otomatis mengekstraksi vektor biometrik 128-D.
              </Typography>

              {/* Mode Selector Tabs (Upload vs Kamera) */}
              <Box
                sx={{
                  display: 'flex',
                  p: 0.5,
                  bgcolor: '#F1F5F9',
                  borderRadius: 3,
                  gap: 1,
                }}
              >
                <Button
                  type="button"
                  variant={photoInputMode === 'upload' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setPhotoInputMode('upload')}
                  startIcon={<CloudUploadIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    flex: 1,
                    py: 1,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: 2.5,
                    border: photoInputMode === 'upload' ? 'none' : '1px solid transparent',
                    bgcolor: photoInputMode === 'upload' ? '#1A3D63' : 'transparent',
                    color: photoInputMode === 'upload' ? '#FFFFFF' : '#475569',
                    '&:hover': {
                      bgcolor: photoInputMode === 'upload' ? '#122D4A' : '#E2E8F0',
                    },
                  }}
                >
                  Unggah Berkas Foto
                </Button>
                <Button
                  type="button"
                  variant={photoInputMode === 'camera' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setPhotoInputMode('camera')}
                  startIcon={<PhotoCameraIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    flex: 1,
                    py: 1,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: 2.5,
                    border: photoInputMode === 'camera' ? 'none' : '1px solid transparent',
                    bgcolor: photoInputMode === 'camera' ? '#0084FF' : 'transparent',
                    color: photoInputMode === 'camera' ? '#FFFFFF' : '#475569',
                    '&:hover': {
                      bgcolor: photoInputMode === 'camera' ? '#0070DE' : '#E2E8F0',
                    },
                  }}
                >
                  Ambil Lewat Kamera
                </Button>
              </Box>

              {/* MODE 1: UPLOAD BERKAS */}
              {photoInputMode === 'upload' && !uploadPreview && (
                <Box
                  onClick={() => !isExtractingEmb && document.getElementById('photo-upload-input')?.click()}
                  sx={{
                    border: '2px dashed',
                    borderColor: '#B3CFE5',
                    bgcolor: '#F6FAFD',
                    borderRadius: 3.5,
                    p: { xs: 3, sm: 4.5 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isExtractingEmb ? 'not-allowed' : 'pointer',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      borderColor: '#1A3D63',
                      bgcolor: '#EEF5FC',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 72,
                      height: 72,
                      bgcolor: '#E6F0FA',
                      color: '#1A3D63',
                      mb: 2,
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    <CloudUploadIcon sx={{ fontSize: 36 }} />
                  </Avatar>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1A3D63', textAlign: 'center' }}>
                    Klik atau seret berkas foto ke sini
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#4A7FA7', textAlign: 'center', mt: 0.5 }}>
                    Format JPG, PNG, WEBP — maksimal 10MB
                  </Typography>
                  <Chip
                    label="Pas foto berseragam direkomendasikan"
                    size="small"
                    sx={{
                      mt: 1.5,
                      bgcolor: 'rgba(16, 185, 129, 0.1)',
                      color: '#059669',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      borderRadius: 2,
                    }}
                  />
                  <input
                    id="photo-upload-input"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                </Box>
              )}

              {/* MODE 2: AMBIL DARI KAMERA */}
              {photoInputMode === 'camera' && !uploadPreview && (
                <Box sx={{ width: '100%' }}>
                  <FaceCameraCapture
                    onCapture={handleCameraCapture}
                    autoStart={true}
                    showConfirmStep={true}
                  />
                </Box>
              )}

              {/* PREVIEW HASIL FOTO (BERLAKU UNTUK KEDUA MODE) */}
              {uploadPreview && (
                <Box
                  sx={{
                    border: '2px solid #34D399',
                    bgcolor: 'rgba(236, 253, 245, 0.7)',
                    borderRadius: 3.5,
                    p: { xs: 2.5, sm: 3 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Box
                    component="img"
                    src={uploadPreview}
                    alt="Preview Foto Siswa"
                    sx={{
                      maxHeight: 250,
                      maxWidth: '100%',
                      borderRadius: 2.5,
                      objectFit: 'contain',
                      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)',
                    }}
                  />
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCapturedData(null);
                        setUploadPreview(null);
                      }}
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#DC2626',
                        borderColor: '#FCA5A5',
                        bgcolor: '#FFFFFF',
                      }}
                    >
                      Ganti / Ambil Ulang Foto
                    </Button>
                    <input
                      id="photo-upload-input"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                  </Stack>
                </Box>
              )}

              {/* Extraction Progress */}
              {isExtractingEmb && (
                <Alert
                  severity="info"
                  icon={<CircularProgress size={18} sx={{ color: '#1A3D63' }} />}
                  sx={{ borderRadius: 2.5, fontWeight: 600, bgcolor: '#EBF4FC', color: '#1A3D63' }}
                >
                  Menganalisis dan mengekstraksi fitur biometrik wajah siswa... Mohon tunggu.
                </Alert>
              )}

              {/* Success Extraction Badge */}
              {capturedData?.photoUrl && !isExtractingEmb && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#10B981', width: 36, height: 36 }}>
                      <CheckCircleIcon sx={{ color: '#FFFFFF', fontSize: 20 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#065F46' }}>
                        Wajah Berhasil Dideteksi!
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#047857', display: 'block' }}>
                        {capturedData.faceVector?.length === 128
                          ? '128-D Face Vector biometrik siap dipasangkan'
                          : `${capturedData.faceVector?.length || 0}-D vektor tersimpan`}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCapturedData(null);
                      setUploadPreview(null);
                    }}
                    sx={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                  >
                    Ganti
                  </Button>
                </Paper>
              )}
            </Box>
          </Card>

          {/* RIGHT COLUMN: STUDENT FORM INPUTS */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card title="Langkah 2: Data Identitas Siswa">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Quick select from CSV-imported students */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: '#F6FAFD',
                    border: '1px solid #B3CFE5',
                    borderRadius: 2.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#1A3D63' }}>
                      Pilih dari Siswa Terimpor:
                    </Typography>
                    <Chip
                      label={`${importedStudents.length} siswa`}
                      size="small"
                      sx={{ fontSize: '0.68rem', height: 20, bgcolor: '#E2EEF8', color: '#1A3D63', fontWeight: 700 }}
                    />
                  </Box>
                  <MuiSelectField
                    value={selectedImportedStudentId}
                    onChange={handleSelectImportedStudent}
                    label="Pilih Siswa"
                    size="small"
                  >
                    <MenuItem value="">
                      <em>-- Manual / Pilih Siswa Terimpor --</em>
                    </MenuItem>
                    {importedStudents.map((st) => (
                      <MenuItem key={st.id} value={st.id}>
                        {st.name} ({st.nisn}) - {st.classCode}
                      </MenuItem>
                    ))}
                  </MuiSelectField>
                  {selectedImportedStudentId && (
                    <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700, mt: 1, display: 'block' }}>
                      ✓ Form terisi otomatis dari data impor.
                    </Typography>
                  )}
                </Paper>

                <StyledTextField
                  label="Nama Lengkap Siswa"
                  required
                  placeholder="Contoh: Ahmad Rizky Pratama"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  size="small"
                />

                <StyledTextField
                  label="NISN / Nomor Induk Siswa"
                  required
                  placeholder="Contoh: 0089281723"
                  value={studentForm.nisn}
                  onChange={(e) => setStudentForm({ ...studentForm, nisn: e.target.value })}
                  size="small"
                />

                <MuiSelectField
                  label="Rombel Kelas"
                  value={studentForm.classCode}
                  onChange={(e) => setStudentForm({ ...studentForm, classCode: e.target.value })}
                  size="small"
                >
                  {classList.length > 0 ? (
                    classList.map((c) => (
                      <MenuItem key={c.id} value={c.class_code || c.name}>
                        {c.class_code ? `${c.class_code} - ${c.course_name || 'Mata Pelajaran'}` : c.name}
                      </MenuItem>
                    ))
                  ) : (
                    ['VII-A', 'VII-B', 'VII-C', 'VII-D', 'VII-E', 'VII-F', 'VII-G', 'VIII-A', 'VIII-B', 'VIII-C', 'VIII-D', 'IX-A', 'IX-B', 'IX-C'].map((k) => (
                      <MenuItem key={k} value={`Kelas ${k}`}>
                        Kelas {k}
                      </MenuItem>
                    ))
                  )}
                </MuiSelectField>

                <Divider sx={{ my: 0.5, borderColor: '#B3CFE5' }} />

                <Button
                  type="submit"
                  variant="emerald"
                  disabled={loading}
                  startIcon={
                    loading ? (
                      <CircularProgress size={18} sx={{ color: '#FFFFFF' }} />
                    ) : (
                      <SaveIcon />
                    )
                  }
                  sx={{ py: 1.4, fontWeight: 800, letterSpacing: '0.02em' }}
                >
                  {loading ? 'Menyimpan Data...' : 'Simpan & Registrasikan Wajah'}
                </Button>
              </Box>
            </Card>

            {/* System Info Note */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: 'rgba(246, 250, 253, 0.8)',
                border: '1px solid #B3CFE5',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoOutlinedIcon sx={{ color: '#1A3D63', fontSize: 18 }} />
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#0A1931' }}>
                  Petunjuk Registrasi Wajah:
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#4A7FA7', lineHeight: 1.6 }}>
                • Sampel biometrik akan otomatis disimpan ke database AI face recognition SMPN 1 Prambon.
              </Typography>
              <Typography variant="caption" sx={{ color: '#4A7FA7', lineHeight: 1.6 }}>
                • Siswa yang didaftarkan langsung terdaftar (auto-enrolled) ke rombel kelas yang dipilih.
              </Typography>
            </Paper>
          </Box>
        </Box>
      </form>

      {/* POP-UP MODAL: SUCCESSFUL REGISTRATION & DIGITAL STUDENT CARD */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={handleResetForm}
        title="Registrasi Wajah Berhasil"
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Alert severity="success" sx={{ borderRadius: 2, fontWeight: 700 }}>
            Data wajah dan identitas siswa berhasil didaftarkan ke sistem presensi digital.
          </Alert>

          {/* Digital Student Card Preview */}
          {savedStudentCard && (
            <Paper
              elevation={4}
              sx={{
                background: 'linear-gradient(135deg, #1A3D63 0%, #0A1931 100%)',
                border: '2px solid #4A7FA7',
                borderRadius: 3,
                p: 3,
                color: '#FFFFFF',
                boxShadow: '0 12px 32px rgba(10, 25, 49, 0.4)',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(179, 207, 229, 0.25)',
                  pb: 2,
                  mb: 2,
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, letterSpacing: '0.08em', color: '#FFFFFF' }}>
                    KARTU PRESENSI DIGITAL
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#B3CFE5', display: 'block' }}>
                    SMP Negeri 1 Prambon - Sidoarjo
                  </Typography>
                </Box>
                <Chip
                  label="AI RECOGNITION"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(74, 127, 167, 0.3)',
                    color: '#B3CFE5',
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    border: '1px solid rgba(179, 207, 229, 0.4)',
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 96,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '2px solid #B3CFE5',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    bgcolor: '#FFFFFF',
                    flexShrink: 0,
                  }}
                >
                  <Box
                    component="img"
                    src={savedStudentCard.photoUrl}
                    alt={savedStudentCard.name}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#FFFFFF' }}>
                    {savedStudentCard.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#E2E8F0', fontSize: '0.8rem' }}>
                    <strong>NISN:</strong> {savedStudentCard.nisn}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#E2E8F0', fontSize: '0.8rem' }}>
                    <strong>Rombel:</strong> {savedStudentCard.classCode}
                  </Typography>
                  <Chip
                    label="● Sampel Wajah Terdaftar"
                    size="small"
                    sx={{
                      width: 'fit-content',
                      mt: 0.5,
                      bgcolor: 'rgba(16, 185, 129, 0.2)',
                      color: '#6EE7B7',
                      fontWeight: 700,
                      fontSize: '0.68rem',
                      height: 20,
                    }}
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  mt: 2.5,
                  pt: 1.5,
                  borderTop: '1px solid rgba(179, 207, 229, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="caption" sx={{ color: '#B3CFE5' }}>
                  Tgl Registrasi: {savedStudentCard.registeredAt}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#FFFFFF', fontWeight: 700 }}>
                  {savedStudentCard.id}
                </Typography>
              </Box>
            </Paper>
          )}

          <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
              sx={{ flex: 1 }}
            >
              Cetak Kartu
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleResetForm}
              startIcon={<PersonAddAlt1Icon sx={{ fontSize: 16 }} />}
              sx={{ flex: 1 }}
            >
              Daftar Siswa Baru
            </Button>
          </Stack>
        </Box>
      </Modal>

      {/* POP-UP MODAL: BATCH CSV / EXCEL STUDENT DATA IMPORT */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Impor Massal Data Siswa (CSV / Excel)"
      >
        <form onSubmit={handleProcessCsvImport}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: '#F6FAFD',
                border: '1px solid #B3CFE5',
                borderRadius: 2.5,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#0A1931', display: 'block', mb: 0.5 }}>
                Petunjuk Format Impor:
              </Typography>
              <Typography variant="caption" sx={{ color: '#1A3D63', display: 'block', lineHeight: 1.6 }}>
                Format per baris: <code style={{ background: 'rgba(179, 207, 229, 0.4)', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>NISN, Nama Lengkap, Rombel Kelas</code>
              </Typography>
              <Typography variant="caption" sx={{ color: '#4A7FA7', display: 'block', mt: 0.5 }}>
                Contoh: <code>0089281701, Ahmad Rizky Pratama, Kelas VII-A</code>
              </Typography>
            </Paper>

            <StyledTextField
              label="Tempel Data CSV / Baris Daftar Siswa"
              multiline
              rows={6}
              required
              value={csvRawInput}
              onChange={(e) => setCsvRawInput(e.target.value)}
              placeholder="0089281701, Ahmad Rizky Pratama, Kelas VII-A"
              sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
            />

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsImportModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                startIcon={<FileUploadIcon sx={{ fontSize: 16 }} />}
              >
                Proses & Impor Data
              </Button>
            </Stack>
          </Box>
        </form>
      </Modal>

      {/* Alert Snackbar */}
      <MuiAlertSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
}
