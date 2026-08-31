/*
import type {
  TranslationDictionary,
} from "./types";

export const enUS: TranslationDictionary = {
  common: {
    appName: "Academy Platform",

    dialogs: {
      confirmTitle: "Confirm action",
      deleteTitle: "Delete record",
      deleteDescription:
        "This operation may permanently remove the record.",
      archiveTitle: "Archive record",
      archiveDescription:
        "The record will no longer appear in active lists.",
      unlinkTitle: "Remove connection",
      unlinkDescription:
        "The connection will be removed, but the original records will remain.",
      cancelTitle: "Cancel operation",
      publishTitle: "Publish evaluation",
      publishDescription:
        "The published evaluation will become visible in student and guardian reports.",
      finalizeAttendanceTitle:
        "Finalize attendance",
      finalizeAttendanceDescription:
        "Normal attendance editing will be locked after finalization.",
      activateCurriculum: "Activate this curriculum? Its structure can no longer be edited."
    },

    actions: {
      add: "Add",
      create: "Create",
      edit: "Edit",
      update: "Update",
      save: "Save",
      saving: "Saving...",
      delete: "Delete",
      remove: "Remove",
      cancel: "Cancel",
      close: "Close",
      view: "View",
      search: "Search",
      clear: "Clear",
      filter: "Filter",
      download: "Download",
      upload: "Upload",
      uploading: "Uploading...",
      submit: "Submit",
      submitting: "Submitting...",
      publish: "Publish",
      activate: "Activate",
      deactivate: "Deactivate",
      archive: "Archive",
      restore: "Restore",
      regenerate: "Regenerate",
      assign: "Assign",
      link: "Link",
      unlink: "Unlink",
      finalize: "Finalize",
      back: "Back",
      next: "Next",
      previous: "Previous",
      signOut: "Sign out",
    },

    statuses: {
      ACTIVE: "Active",
      INACTIVE: "Inactive",
      ACTIVATING: "Activating",
      ARCHIVED: "Archived",
      DRAFT: "Draft",
      SUBMITTED: "Submitted",
      PUBLISHED: "Published",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
      SCHEDULED: "Scheduled",
      IN_PROGRESS: "In progress",
      POSTPONED: "Postponed",
      PENDING: "Pending",
      PROCESSING: "Processing",
      FAILED: "Failed",
      EXPIRED: "Expired",
      INVITED: "Invited",
      SUSPENDED: "Suspended",
      GRADUATED: "Graduated",
      PRESENT: "Present",
      ABSENT: "Absent",
      LATE: "Late",
      EXCUSED: "Excused",
      NOT_RECORDED: "Not recorded",
      NOT_STARTED: "Not started",
      ON_LEAVE: "On leave",
      WITHDRAWN: "Withdrawn",
      ENDED: "Ended",
      AVAILABLE: "Available",
      DELETED: "Deleted",
      OPEN: "Open",
    },

    fields: {
      name: "Name",
      code: "Code",
      title: "Title",
      description: "Description",
      status: "Status",
      actions: "Actions",
      email: "Email",
      phone: "Phone",
      address: "Address",
      city: "City",
      country: "Country",
      timezone: "Timezone",
      startDate: "Start date",
      endDate: "End date",
      dateFrom: "Date from",
      dateTo: "Date to",
      category: "Category",
      version: "Version",
      branch: "Branch",
      program: "Program",
      term: "Term",
      group: "Group",
      student: "Student",
      staff: "Staff",
      guardian: "Guardian",
      session: "Session",
      notes: "Notes",
      reason: "Reason",
      createdAt: "Created at",
      updatedAt: "Updated at",
      studentNumber: "Student number",
      birthDate: "Birth date",
      location: "Location",
      contact: "Contact"
    },

    messages: {
      loading: "Loading...",
      saving: "Saving...",
      noData: "No data was found.",
      operationSuccessful:
        "The operation was completed successfully.",
      operationFailed:
        "The operation could not be completed.",
      permissionDenied:
        "You do not have permission to access this page.",
      sessionExpired:
        "Your session has expired. Please sign in again.",
      confirmDelete:
        "Are you sure you want to delete this record?",
      confirmArchive:
        "Are you sure you want to archive this record?",
      confirmAction:
        "Are you sure you want to continue?",
    },

    filters: {
      all: "All",
      includeArchived: "Include archived",
      allStatuses: "All statuses",
      allPrograms: "All programs",
      allGroups: "All groups",
      allTerms: "All terms",
      allBranches: "All branches",
    },

    pagination: {
      page: "Page",
      of: "of",
      total: "Total",
    },
  },

  navigation: {
    dashboard: "Dashboard",
    myChildren: "My Children",
    users: "Users",
    students: "Students",
    guardians: "Guardians",
    staff: "Staff",
    branches: "Branches",
    programs: "Programs",
    terms: "Terms",
    curricula: "Curricula",
    groups: "Groups",
    schedule: "Schedule",
    evaluationModels: "Evaluation Models",
    evaluations: "Evaluations",
    media: "Media",
    reports: "Reports",
    settings: "Settings",
    menu: "Menu",
  },

  screens: {
    dashboard: {
      title: "Dashboard",
      description:
        "View organization activity and statistics.",
      create: "",
      loading: "Loading dashboard...",
      empty: "No dashboard data is available.",
    },

    users: {
      title: "Organization users",
      description:
        "Manage administrators, instructors, and guardians.",
      create: "Create user",
      loading: "Loading users...",
      empty: "No users were found.",
    },

    students: {
      title: "Students",
      description:
        "Manage student records and guardian relationships.",
      create: "Create student",
      loading: "Loading students...",
      empty: "No students were found.",
    },

    guardians: {
      title: "Guardians",
      description:
        "Manage parent and legal guardian profiles.",
      create: "Create guardian profile",
      loading: "Loading guardians...",
      empty: "No guardians were found.",
    },

    staff: {
      title: "Staff",
      description:
        "Manage instructors, coaches, and teachers.",
      create: "Create staff profile",
      loading: "Loading staff...",
      empty: "No staff profiles were found.",
    },

    branches: {
      title: "Branches",
      description:
        "Manage campuses and training locations.",
      create: "Create branch",
      loading: "Loading branches...",
      empty: "No branches were found.",
    },

    programs: {
      title: "Programs",
      description:
        "Manage sports, subjects, departments, and activities.",
      create: "Create program",
      loading: "Loading programs...",
      empty: "No programs were found.",
    },

    terms: {
      title: "Terms",
      description:
        "Manage academic years and activity periods.",
      create: "Create term",
      loading: "Loading terms...",
      empty: "No terms were found.",
    },

    curricula: {
      title: "Curricula",
      description:
        "Manage curriculum units and learning outcomes.",
      create: "Create curriculum",
      loading: "Loading curricula...",
      empty: "No curricula were found.",
    },

    groups: {
      title: "Groups",
      description:
        "Manage classes, teams, and activity groups.",
      create: "Create group",
      loading: "Loading groups...",
      empty: "No groups were found.",
    },

    schedule: {
      title: "Schedule",
      description:
        "Manage lessons and training sessions.",
      create: "Create session",
      loading: "Loading schedule...",
      empty: "No sessions were found.",
    },

    evaluationTemplates: {
      title: "Evaluation Models",
      description:
        "Configure weighted evaluation criteria.",
      create: "Create template",
      loading: "Loading templates...",
      empty: "No evaluation templates were found.",
    },

    evaluations: {
      title: "Evaluations",
      description:
        "Score student performance and publish results.",
      create: "Create evaluation",
      loading: "Loading evaluations...",
      empty: "No evaluations were found.",
    },

    attendance: {
      title: "Attendance",
      description:
        "Record and finalize session attendance.",
      create: "Initialize attendance",
      loading: "Loading attendance...",
      empty: "No attendance records were found.",
    },

    media: {
      title: "Media library",
      description:
        "Manage private photos, videos, and documents.",
      create: "Upload media",
      loading: "Loading media...",
      empty: "No media files were found.",
    },

    reports: {
      title: "Reports",
      description:
        "View and download progress reports.",
      create: "Generate report",
      loading: "Loading reports...",
      empty: "No reports were found.",
    },

    settings: {
      title: "Organization settings",
      description:
        "Manage organization information and terminology.",
      create: "",
      loading: "Loading settings...",
      empty: "Settings are unavailable.",
    },

    myChildren: {
      title: "My Children",
      description:
        "View attendance, progress, evaluations, and media.",
      create: "",
      loading: "Loading linked students...",
      empty:
        "No students are linked to this guardian account.",
    },
  },
};

export const trTR: TranslationDictionary = {
  common: {
    appName: "Akademi Platformu",

    dialogs: {
      confirmTitle: "İşlemi onayla",
      deleteTitle: "Kaydı sil",
      deleteDescription:
        "Bu işlem kaydı kalıcı olarak silebilir.",
      archiveTitle: "Kaydı arşivle",
      archiveDescription:
        "Kayıt artık aktif listelerde gösterilmeyecektir.",
      unlinkTitle: "Bağlantıyı kaldır",
      unlinkDescription:
        "Bağlantı kaldırılacak ancak asıl kayıtlar korunacaktır.",
      cancelTitle: "İşlemi iptal et",
      publishTitle: "Değerlendirmeyi yayınla",
      publishDescription:
        "Yayınlanan değerlendirme öğrenci ve veli raporlarında görüntülenebilecektir.",
      finalizeAttendanceTitle:
        "Yoklamayı kesinleştir",
      finalizeAttendanceDescription:
        "Kesinleştirmeden sonra normal yoklama düzenleme işlemi kilitlenecektir.",
      activateCurriculum: "Müfredatı etkinleştir. Bu yapıda daha sonra değişiklik yapılamaz."
    },

    actions: {
      add: "Ekle",
      create: "Oluştur",
      edit: "Düzenle",
      update: "Güncelle",
      save: "Kaydet",
      saving: "Kaydediliyor...",
      delete: "Sil",
      remove: "Kaldır",
      cancel: "İptal",
      close: "Kapat",
      view: "Görüntüle",
      search: "Ara",
      clear: "Temizle",
      filter: "Filtrele",
      download: "İndir",
      upload: "Yükle",
      uploading: "Yükleniyor...",
      submit: "Gönder",
      submitting: "Gönderiliyor...",
      publish: "Yayınla",
      activate: "Aktifleştir",
      deactivate: "Pasifleştir",
      archive: "Arşivle",
      restore: "Geri yükle",
      regenerate: "Yeniden oluştur",
      assign: "Ata",
      link: "Bağla",
      unlink: "Bağlantıyı kaldır",
      finalize: "Kesinleştir",
      back: "Geri",
      next: "Sonraki",
      previous: "Önceki",
      signOut: "Çıkış yap",
    },

    statuses: {
      ACTIVE: "Aktif",
      INACTIVE: "Pasif",
      ACTIVATING: "Aktif ediliyor",
      ARCHIVED: "Arşivlendi",
      DRAFT: "Taslak",
      SUBMITTED: "Gönderildi",
      PUBLISHED: "Yayınlandı",
      COMPLETED: "Tamamlandı",
      CANCELLED: "İptal edildi",
      SCHEDULED: "Planlandı",
      IN_PROGRESS: "Devam ediyor",
      POSTPONED: "Ertelendi",
      PENDING: "Bekliyor",
      PROCESSING: "İşleniyor",
      FAILED: "Başarısız",
      EXPIRED: "Süresi doldu",
      INVITED: "Davet edildi",
      SUSPENDED: "Askıya alındı",
      GRADUATED: "Mezun",
      PRESENT: "Katıldı",
      ABSENT: "Katılmadı",
      LATE: "Geç kaldı",
      EXCUSED: "Mazeretli",
      NOT_RECORDED: "Kaydedilmedi",
      NOT_STARTED: "Başlamadı",
      ON_LEAVE: "İzinli",
      WITHDRAWN: "Ayrıldı",
      ENDED: "Sona erdi",
      AVAILABLE: "Kullanılabilir",
      DELETED: "Silindi",
      OPEN: "Açık",
    },

    fields: {
      name: "Ad",
      code: "Kod",
      title: "Başlık",
      description: "Açıklama",
      status: "Durum",
      actions: "İşlemler",
      email: "E-posta",
      phone: "Telefon",
      address: "Adres",
      city: "Şehir",
      country: "Ülke",
      timezone: "Saat dilimi",
      startDate: "Başlangıç tarihi",
      endDate: "Bitiş tarihi",
      dateFrom: "Başlangıç",
      dateTo: "Bitiş",
      category: "Kategori",
      version: "Sürüm",
      branch: "Şube",
      program: "Program",
      term: "Dönem",
      group: "Grup",
      student: "Öğrenci",
      staff: "Personel",
      guardian: "Veli",
      session: "Ders",
      notes: "Notlar",
      reason: "Sebep",
      createdAt: "Oluşturulma tarihi",
      updatedAt: "Güncellenme tarihi",
      studentNumber: "Öğrenci numarası",
      birthDate: "Doğum tarihi",
      location: "Konum",
      contact: "İletişim"
    },

    messages: {
      loading: "Yükleniyor...",
      saving: "Kaydediliyor...",
      noData: "Veri bulunamadı.",
      operationSuccessful:
        "İşlem başarıyla tamamlandı.",
      operationFailed:
        "İşlem tamamlanamadı.",
      permissionDenied:
        "Bu sayfaya erişim yetkiniz yok.",
      sessionExpired:
        "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.",
      confirmDelete:
        "Bu kaydı silmek istediğinizden emin misiniz?",
      confirmArchive:
        "Bu kaydı arşivlemek istediğinizden emin misiniz?",
      confirmAction:
        "Devam etmek istediğinizden emin misiniz?",
    },

    filters: {
      all: "Tümü",
      includeArchived:
        "Arşivlenenleri göster",
      allStatuses: "Tüm durumlar",
      allPrograms: "Tüm programlar",
      allGroups: "Tüm gruplar",
      allTerms: "Tüm dönemler",
      allBranches: "Tüm şubeler",
    },

    pagination: {
      page: "Sayfa",
      of: "/",
      total: "Toplam",
    },
  },

  navigation: {
    dashboard: "Panel",
    myChildren: "Çocuklarım",
    users: "Kullanıcılar",
    students: "Öğrenciler",
    guardians: "Veliler",
    staff: "Personel",
    branches: "Şubeler",
    programs: "Programlar",
    terms: "Dönemler",
    curricula: "Müfredatlar",
    groups: "Gruplar",
    schedule: "Takvim",
    evaluationModels:
      "Değerlendirme Modelleri",
    evaluations: "Değerlendirmeler",
    media: "Medya",
    reports: "Raporlar",
    settings: "Ayarlar",
    menu: "Menü",
  },

  screens: {
    dashboard: {
      title: "Yönetim Paneli",
      description:
        "Kurum etkinliklerini ve istatistiklerini görüntüleyin.",
      create: "",
      loading: "Panel yükleniyor...",
      empty: "Panel verisi bulunamadı.",
    },

    users: {
      title: "Kurum kullanıcıları",
      description:
        "Yönetici, antrenör ve veli hesaplarını yönetin.",
      create: "Kullanıcı oluştur",
      loading: "Kullanıcılar yükleniyor...",
      empty: "Kullanıcı bulunamadı.",
    },

    students: {
      title: "Öğrenciler",
      description:
        "Öğrenci kayıtlarını ve veli ilişkilerini yönetin.",
      create: "Öğrenci oluştur",
      loading: "Öğrenciler yükleniyor...",
      empty: "Öğrenci bulunamadı.",
    },

    guardians: {
      title: "Veliler",
      description:
        "Veli ve yasal vasi profillerini yönetin.",
      create: "Veli profili oluştur",
      loading: "Veliler yükleniyor...",
      empty: "Veli bulunamadı.",
    },

    staff: {
      title: "Personel",
      description:
        "Antrenör, öğretmen ve personelleri yönetin.",
      create: "Personel profili oluştur",
      loading: "Personeller yükleniyor...",
      empty: "Personel bulunamadı.",
    },

    branches: {
      title: "Şubeler",
      description:
        "Kampüs ve antrenman merkezlerini yönetin.",
      create: "Şube oluştur",
      loading: "Şubeler yükleniyor...",
      empty: "Şube bulunamadı.",
    },

    programs: {
      title: "Programlar",
      description:
        "Spor, ders, bölüm ve etkinlik programlarını yönetin.",
      create: "Program oluştur",
      loading: "Programlar yükleniyor...",
      empty: "Program bulunamadı.",
    },

    terms: {
      title: "Dönemler",
      description:
        "Akademik yıl ve etkinlik dönemlerini yönetin.",
      create: "Dönem oluştur",
      loading: "Dönemler yükleniyor...",
      empty: "Dönem bulunamadı.",
    },

    curricula: {
      title: "Müfredatlar",
      description:
        "Müfredat ünitelerini ve öğrenim çıktılarını yönetin.",
      create: "Müfredat oluştur",
      loading: "Müfredatlar yükleniyor...",
      empty: "Müfredat bulunamadı.",
    },

    groups: {
      title: "Gruplar",
      description:
        "Sınıf, takım ve etkinlik gruplarını yönetin.",
      create: "Grup oluştur",
      loading: "Gruplar yükleniyor...",
      empty: "Grup bulunamadı.",
    },

    schedule: {
      title: "Takvim",
      description:
        "Ders ve antrenman oturumlarını yönetin.",
      create: "Ders oluştur",
      loading: "Takvim yükleniyor...",
      empty: "Ders bulunamadı.",
    },

    evaluationTemplates: {
      title: "Değerlendirme Modelleri",
      description:
        "Ağırlıklı değerlendirme kriterlerini yönetin.",
      create: "Model oluştur",
      loading:
        "Değerlendirme modelleri yükleniyor...",
      empty:
        "Değerlendirme modeli bulunamadı.",
    },

    evaluations: {
      title: "Değerlendirmeler",
      description:
        "Öğrenci performansını puanlayın ve sonuçları yayınlayın.",
      create: "Değerlendirme oluştur",
      loading:
        "Değerlendirmeler yükleniyor...",
      empty: "Değerlendirme bulunamadı.",
    },

    attendance: {
      title: "Yoklama",
      description:
        "Ders yoklamasını kaydedin ve kesinleştirin.",
      create: "Yoklamayı başlat",
      loading: "Yoklama yükleniyor...",
      empty: "Yoklama kaydı bulunamadı.",
    },

    media: {
      title: "Medya Kütüphanesi",
      description:
        "Özel fotoğraf, video ve belgeleri yönetin.",
      create: "Medya yükle",
      loading: "Medya yükleniyor...",
      empty: "Medya bulunamadı.",
    },

    reports: {
      title: "Raporlar",
      description:
        "Gelişim raporlarını görüntüleyin ve indirin.",
      create: "Rapor oluştur",
      loading: "Raporlar yükleniyor...",
      empty: "Rapor bulunamadı.",
    },

    settings: {
      title: "Kurum Ayarları",
      description:
        "Kurum bilgilerini ve terminolojiyi yönetin.",
      create: "",
      loading: "Ayarlar yükleniyor...",
      empty: "Ayarlar kullanılamıyor.",
    },

    myChildren: {
      title: "Çocuklarım",
      description:
        "Yoklama, gelişim, değerlendirme ve medyayı görüntüleyin.",
      create: "",
      loading:
        "Bağlı öğrenciler yükleniyor...",
      empty:
        "Bu veli hesabına bağlı öğrenci bulunamadı.",
    },
  },
};

export const dictionaries = {
  "en-US": enUS,
  "tr-TR": trTR,
};

*/