import type { BookingStatus } from "@/types/domain";
import type { CategoryKey, Language } from "./translations";

export type AdminErrorCode =
  | "generic"
  | "request_failed"
  | "validation_failed"
  | "invalid_time"
  | "invalid_date"
  | "time_range_invalid"
  | "break_outside_hours"
  | "breaks_overlap"
  | "duplicate_day"
  | "blocked_times_overlap"
  | "unauthorized"
  | "invalid_phone"
  | "client_phone_exists"
  | "client_not_found"
  | "booking_not_found"
  | "note_not_found"
  | "photo_not_found"
  | "template_not_found"
  | "invalid_services"
  | "slot_unavailable"
  | "slot_taken"
  | "booking_status_conflict"
  | "booking_not_started"
  | "reschedule_option_not_found"
  | "booking_not_owned_by_client"
  | "invalid_file_type"
  | "file_too_large"
  | "file_required"
  | "unsupported_file"
  | "rows_required"
  | "import_file_empty"
  | "booking_id_required"
  | "unsupported_action"
  | "service_id_required"
  | "service_in_use"
  | "confirmation_required"
  | "client_ids_required"
  | "date_range_required"
  | "unsupported_export_format"
  | "client_id_required";

export type AdminTranslation = {
  nav: Record<
    | "dashboard"
    | "calendar"
    | "bookings"
    | "clients"
    | "services"
    | "schedule"
    | "portfolio"
    | "sms"
    | "settings"
    | "logout"
    | "openSite",
    string
  >;
  common: Record<
    | "admin"
    | "search"
    | "save"
    | "edit"
    | "delete"
    | "active"
    | "inactive"
    | "enabled"
    | "disabled"
    | "remove"
    | "loading"
    | "saved"
    | "none"
    | "all"
    | "add"
    | "cancel"
    | "close"
    | "details"
    | "amd"
    | "minutes"
    | "language",
    string
  >;
  dashboard: Record<
    | "title"
    | "subtitle"
    | "newRequests"
    | "todayBookings"
    | "upcomingBookings"
    | "cancelledBookings"
    | "quickActions"
    | "latestRequests"
    | "sameLogic"
    | "noShowBookings"
    | "monthRevenue"
    | "monthVisits",
    string
  >;
  calendar: Record<
    | "title"
    | "subtitle"
    | "bookingCalendar"
    | "today"
    | "previousMonth"
    | "nextMonth"
    | "noBookingsThisDay"
    | "bookings"
    | "details"
    | "search"
    | "filterByStatus"
    | "filterByCategory"
    | "selectedDay"
    | "refresh"
    | "month"
    | "week"
    | "day"
    | "more"
    | "beautyCrm"
    | "addBooking"
    | "selectClient"
    | "newClient"
    | "date"
    | "time"
    | "service"
    | "confirmed"
    | "pendingConfirmation"
    | "searchClient"
    | "searchClientPlaceholder"
    | "noClientsFound"
    | "clientFoundByPhone"
    | "selectedClient"
    | "changeClient"
    | "newClientHint"
    | "visits"
    | "freeSlot"
    | "breakTime"
    | "blockedTime"
    | "dayOff"
    | "freeSlots"
    | "summaryTitle"
    | "summaryTotal"
    | "summaryConfirmed"
    | "summaryPending"
    | "summaryCancelled"
    | "summaryCompleted"
    | "summaryFreeSlots"
    | "summaryFreeSlotsHint"
    | "previousPeriod"
    | "nextPeriod"
    | "summaryNoShow"
    | "endTime",
    string
  >;
  bookings: Record<
    | "title"
    | "subtitle"
    | "client"
    | "phone"
    | "services"
    | "date"
    | "time"
    | "duration"
    | "price"
    | "status"
    | "comment"
    | "createdAt"
    | "confirm"
    | "cancel"
    | "suggestAnotherTime"
    | "changeDateTime"
    | "callClient"
    | "filterByStatus"
    | "filterByDate"
    | "filterByCategory"
    | "searchPlaceholder"
    | "allStatuses"
    | "allCategories"
    | "allDates"
    | "list"
    | "googleEvent"
    | "telegramMessage"
    | "confirmedAt"
    | "cancelledAt"
    | "bookingId"
    | "markCompleted"
    | "createHistory"
    | "crmDetailsTitle"
    | "crmDetailsSubtitle"
    | "markNoShow"
    | "markCameAfterAll"
    | "noShowNotStarted",
    string
  >;
  clients: Record<
    | "title"
    | "subtitle"
    | "client"
    | "addClient"
    | "editClientCard"
    | "clientSaved"
    | "clientGroups"
    | "clearFilter"
    | "showingClients"
    | "clientsLabel"
    | "allClients"
    | "allClientsSubtitle"
    | "active"
    | "activeSubtitle"
    | "sleeping"
    | "sleepingSubtitle"
    | "lost"
    | "lostSubtitle"
    | "newClient"
    | "newSubtitle"
    | "withUpcomingBooking"
    | "withUpcomingBookingSubtitle"
    | "oneVisitClients"
    | "oneVisitClientsSubtitle"
    | "withoutBookings"
    | "withoutBookingsSubtitle"
    | "onlineBookingClients"
    | "onlineBookingClientsSubtitle"
    | "debtors"
    | "debtorsSubtitle"
    | "vip"
    | "vipSubtitle"
    | "blacklist"
    | "blacklistSubtitle"
    | "inactive"
    | "fullName"
    | "phone"
    | "email"
    | "comment"
    | "balance"
    | "discount"
    | "birthDate"
    | "address"
    | "status"
    | "nonVip"
    | "notBlacklisted"
    | "noDebt"
    | "sortBy"
    | "sortCreatedAt"
    | "sortName"
    | "sortLastVisitDate"
    | "sortBalance"
    | "notes"
    | "lastVisitDate"
    | "visitsCount"
    | "source"
    | "createdAt"
    | "updatedAt"
    | "searchPlaceholder"
    | "importFromExcel"
    | "exportExcel"
    | "exportAccess"
    | "download"
    | "chooseFile"
    | "preview"
    | "confirmImport"
    | "clearClients"
    | "selectAll"
    | "deselectAll"
    | "deleteSelected"
    | "deleteAllClients"
    | "selectedClients"
    | "confirmDelete"
    | "cancelDelete"
    | "yesDelete"
    | "noClientsSelected"
    | "deleteConfirmationText"
    | "deleteAllConfirmationText"
    | "typeDeleteClients"
    | "deleteSuccess"
    | "deleteError"
    | "clientProfile"
    | "backToClients"
    | "overview"
    | "history"
    | "visits"
    | "procedures"
    | "preparations"
    | "bookings"
    | "addVisit"
    | "addProcedure"
    | "addBooking"
    | "addNote"
    | "addPreparation"
    | "preparation"
    | "amount"
    | "unit"
    | "area"
    | "price"
    | "date"
    | "doctorNotes"
    | "procedureSaved"
    | "procedureDeleted"
    | "recordsPerPage"
    | "page"
    | "previous"
    | "next"
    | "emptyTab"
    | "editClient"
    | "added"
    | "updated"
    | "skipped"
    | "errors"
    | "phoneRequired"
    | "invalidPhone"
    | "duplicateClient"
    | "validationStatus"
    | "duplicateStatus"
    | "detectedColumns"
    | "mappedFields"
    | "firstTwentyRows"
    | "duplicateBehavior"
    | "updateExisting"
    | "skipDuplicates"
    | "totalRows"
    | "validRows"
    | "errorRows"
    | "duplicateRows"
    | "importSummary"
    | "noClients"
    | "photos"
    | "uploadPhoto"
    | "before"
    | "after"
    | "document"
    | "other"
    | "deletePhoto"
    | "invalidFileType"
    | "fileTooLarge"
    | "photoSaved"
    | "photoUploaded"
    | "photoDeleted"
    | "somethingWentWrong"
    | "validPhotoRequired"
    | "noPhotos"
    | "dropPhoto"
    | "savePhoto"
    | "fileHelp"
    | "selectedCountLabel"
    | "exportSectionTitle"
    | "exportSectionSubtitle"
    | "crmNotesTitle"
    | "crmNotesSubtitle"
    | "importantFlag"
    | "pinNote"
    | "noServicesFound"
    | "selectService",
    string
  >;
  services: Record<
    | "title"
    | "subtitle"
    | "addService"
    | "editService"
    | "deleteService"
    | "category"
    | "name"
    | "description"
    | "duration"
    | "price"
    | "active"
    | "save"
    | "priceAmd"
    | "durationMinutes",
    string
  >;
  schedule: Record<
    | "title"
    | "subtitle"
    | "workingDays"
    | "workingHours"
    | "breaks"
    | "blockedTime"
    | "dayOff"
    | "addBlockedTime"
    | "start"
    | "end"
    | "reason"
    | "saveWorkingHours"
    | "noBreaks",
    string
  >;
  portfolio: Record<
    | "title"
    | "subtitle"
    | "addPhoto"
    | "editCaption"
    | "deletePhoto"
    | "changeOrder"
    | "active"
    | "imageUrl"
    | "caption"
    | "savePhoto"
    | "editPhoto",
    string
  >;
  settings: Record<
    | "title"
    | "subtitle"
    | "address"
    | "phone"
    | "instagram"
    | "telegramChatId"
    | "googleCalendarId"
    | "googleCalendarEnabled"
    | "bookingHorizonDays"
    | "minBookingLeadMinutes"
    | "saveSettings"
    | "doctorAbout"
    | "integrationWarning",
    string
  >;
  sms: Record<
    | "title"
    | "subtitle"
    | "tabScheduled"
    | "tabArchive"
    | "tabTemplates"
    | "tabManual"
    | "tabSettings"
    | "provider"
    | "autoSend"
    | "statusMock"
    | "statusDemo"
    | "demoModeNote"
    | "demoNotSent"
    | "statusReal"
    | "autoSendOn"
    | "autoSendOff"
    | "safetyMockNote"
    | "safetyRealOffNote"
    | "client"
    | "phone"
    | "type"
    | "message"
    | "scheduledAt"
    | "status"
    | "sentAt"
    | "providerColumn"
    | "error"
    | "createdAt"
    | "actions"
    | "attempts"
    | "statusScheduled"
    | "statusSent"
    | "statusFailed"
    | "statusCancelled"
    | "statusSkipped"
    | "typeConfirmation"
    | "typeReminder"
    | "typeCancelled"
    | "typeRescheduled"
    | "typeBirthday"
    | "typeLoyalty"
    | "typeCustom"
    | "cancelSms"
    | "resend"
    | "sendNow"
    | "generateReminders"
    | "remindersGenerated"
    | "saved"
    | "manualSubtitle"
    | "filterLabel"
    | "filterAll"
    | "filterVip"
    | "filterActive"
    | "filterSleeping"
    | "filterUpcoming"
    | "filterBirthdayWeek"
    | "filterBirthdayMonth"
    | "chooseType"
    | "chooseTemplate"
    | "customMessage"
    | "customMessageHint"
    | "discount"
    | "preview"
    | "previewEmpty"
    | "send"
    | "selectedCount"
    | "selectClientsHint"
    | "confirmTitle"
    | "confirmText"
    | "recipients"
    | "resultDispatched"
    | "resultScheduled"
    | "resultSkipped"
    | "resultDuplicates"
    | "resultTotal"
    | "noRecipients"
    | "availableVariables"
    | "autoSendEnabled"
    | "autoSendEnabledHint"
    | "reminderEnabled"
    | "reminderOffsets"
    | "offsetSameDay"
    | "offset1"
    | "offset2"
    | "offset3"
    | "birthdayAutoEnabled"
    | "birthdayAutoHint"
    | "noScheduled"
    | "noLogs"
    | "refresh"
    | "sendNowDisabledNote"
    | "selectAll"
    | "deselectAll"
    | "sendDisabledReal"
    | "senderPhone"
    | "notConfigured",
    string
  >;
  channels: Record<
    | "title"
    | "hint"
    | "column"
    | "filterAll"
    | "saved"
    | "statusTitle"
    | "notConnected"
    | "connected"
    | "demoExplanation",
    string
  >;
  rating: Record<
    | "title"
    | "subtitle"
    | "rank"
    | "client"
    | "visits"
    | "spent"
    | "lastVisit"
    | "activeBadge"
    | "activeHint"
    | "topHint"
    | "empty"
    | "allClients"
    | "sortVisits"
    | "sortSpent"
    | "segment"
    | "segmentSleeping"
    | "segmentLost"
    | "segmentNew",
    string
  >;
  status: Record<BookingStatus, string>;
  categories: Record<CategoryKey, string>;
  weekdays: string[];
  login: Record<
    "passwordLabel" | "submit" | "hint" | "invalidPassword" | "tooManyAttempts" | "demoHint",
    string
  >;
  errors: Record<AdminErrorCode, string>;
};

export const adminTranslations: Record<Language, AdminTranslation> = {
  hy: {
    nav: {
      dashboard: "Վահանակ",
      calendar: "Օրացույց",
      bookings: "Գրանցումներ",
      clients: "Հաճախորդներ",
      services: "Ծառայություններ",
      schedule: "Գրաֆիկ",
      portfolio: "Պորտֆոլիո",
      sms: "SMS",
      settings: "Կարգավորումներ",
      logout: "Դուրս գալ",
      openSite: "Բացել կայքը"
    },
    common: {
      admin: "Dr. Edgar Admin",
      search: "Որոնել",
      save: "Պահպանել",
      edit: "Խմբագրել",
      delete: "Ջնջել",
      active: "Ակտիվ",
      inactive: "Անջատված",
      enabled: "Միացված",
      disabled: "Անջատված",
      remove: "Հեռացնել",
      loading: "Բեռնվում է...",
      saved: "Պահպանված է",
      none: "չկա",
      all: "Բոլորը",
      add: "Ավելացնել",
      cancel: "Չեղարկել",
      close: "Փակել",
      details: "Մանրամասներ",
      amd: "AMD",
      minutes: "րոպե",
      language: "Լեզու"
    },
    dashboard: {
      title: "Վահանակ",
      subtitle: "Գրանցումների, հաստատումների և արագ գործողությունների ընդհանուր պատկեր։",
      newRequests: "Նոր հայտեր",
      todayBookings: "Այսօրվա գրանցումներ",
      upcomingBookings: "Առաջիկա գրանցումներ",
      cancelledBookings: "Չեղարկված գրանցումներ",
      quickActions: "Արագ գործողություններ",
      latestRequests: "Վերջին հայտերը",
      sameLogic: "Գործողությունները օգտագործում են նույն բիզնես տրամաբանությունը, ինչ Telegram կոճակները։",
      noShowBookings: "Չներկայացած",
      monthRevenue: "Եկամուտ այս ամիս",
      monthVisits: "Այցեր այս ամիս"
    },
    calendar: {
      title: "Օրացույց",
      subtitle: "Գունավոր CRM օրացույց՝ օրվա մանրամասներով և արագ գործողություններով։",
      bookingCalendar: "Գրանցումների օրացույց",
      today: "Այսօր",
      previousMonth: "Նախորդ ամիս",
      nextMonth: "Հաջորդ ամիս",
      noBookingsThisDay: "Այս օրը գրանցումներ չկան",
      bookings: "Գրանցումներ",
      details: "Մանրամասներ",
      search: "Որոնում",
      filterByStatus: "Ֆիլտր ըստ կարգավիճակի",
      filterByCategory: "Ֆիլտր ըստ կատեգորիայի",
      selectedDay: "Ընտրված օր",
      refresh: "Թարմացնել",
      month: "Ամիս",
      week: "Շաբաթ",
      day: "Օր",
      more: "ևս",
      beautyCrm: "Beauty CRM",
      addBooking: "Ավելացնել գրանցում",
      selectClient: "Ընտրել հաճախորդ",
      newClient: "Նոր հաճախորդ",
      date: "Ամսաթիվ",
      time: "Ժամ",
      service: "Ծառայություն",
      confirmed: "Հաստատված",
      pendingConfirmation: "Սպասում է հաստատման",
      searchClient: "Որոնել հաճախորդ",
      searchClientPlaceholder: "Անուն, ազգանուն կամ հեռախոս",
      noClientsFound: "Հաճախորդ չի գտնվել։ Լրացրեք տվյալները ներքևում՝ նոր հաճախորդ կստեղծվի։",
      clientFoundByPhone: "Այս հեռախոսահամարով հաճախորդն արդեն կա՝ ընտրված է ավտոմատ",
      selectedClient: "Ընտրված հաճախորդ",
      changeClient: "Փոխել",
      newClientHint: "Նոր հաճախորդ կստեղծվի",
      visits: "այցեր",
      freeSlot: "Ազատ",
      breakTime: "Ընդմիջում",
      blockedTime: "Արգելափակված",
      dayOff: "Հանգստյան օր",
      freeSlots: "ազատ",
      summaryTitle: "Ամփոփում ընտրված ժամանակահատվածի համար",
      summaryTotal: "Ընդամենը",
      summaryConfirmed: "Հաստատված",
      summaryPending: "Սպասում են",
      summaryCancelled: "Չեղարկված",
      summaryCompleted: "Ավարտված",
      summaryFreeSlots: "Ազատ սլոթեր",
      summaryFreeSlotsHint: "30 րոպեանոց ազատ սլոթեր՝ աշխատանքային ժամերով, առանց ընդմիջումների և արգելափակումների",
      previousPeriod: "Նախորդը",
      nextPeriod: "Հաջորդը",
      summaryNoShow: "Չներկայացան",
      endTime: "Ավարտ"
    },
    bookings: {
      title: "Գրանցումներ",
      subtitle: "Բոլոր հայտերը՝ որոնմամբ, ֆիլտրերով և հաստատման գործողություններով։",
      client: "Հաճախորդ",
      phone: "Հեռախոս",
      services: "Ծառայություններ",
      date: "Ամսաթիվ",
      time: "Ժամ",
      duration: "Տևողություն",
      price: "Արժեք",
      status: "Կարգավիճակ",
      comment: "Մեկնաբանություն",
      createdAt: "Ստեղծվել է",
      confirm: "Հաստատել",
      cancel: "Չեղարկել",
      suggestAnotherTime: "Առաջարկել այլ ժամ",
      changeDateTime: "Փոխել օրը/ժամը",
      callClient: "Զանգահարել հաճախորդին",
      filterByStatus: "Կարգավիճակ",
      filterByDate: "Ամսաթիվ",
      filterByCategory: "Կատեգորիա",
      searchPlaceholder: "Որոնել անունով կամ հեռախոսով",
      allStatuses: "Բոլոր կարգավիճակները",
      allCategories: "Բոլոր կատեգորիաները",
      allDates: "Բոլոր օրերը",
      list: "Գրանցումների ցանկ",
      googleEvent: "Google Calendar event ID",
      telegramMessage: "Telegram message ID",
      confirmedAt: "Հաստատվել է",
      cancelledAt: "Չեղարկվել է",
      bookingId: "Գրանցման ID",
      markCompleted: "Նշել կատարվածը",
      createHistory: "Ստեղծել պատմություն",
      crmDetailsTitle: "CRM մանրամասներ",
      crmDetailsSubtitle: "Փաստացի ծառայությունները և մեկնաբանությունը",
      markNoShow: "Չներկայացավ",
      markCameAfterAll: "Այնուամենայնիվ եկավ",
      noShowNotStarted: "Կարելի է նշել միայն այցի սկսվելուց հետո"
    },
    clients: {
      title: "Հաճախորդներ",
      subtitle: "Հաճախորդների բազա՝ անունով կամ հեռախոսահամարով որոնմամբ և Excel ներմուծմամբ։",
      client: "Հաճախորդ",
      addClient: "Ավելացնել հաճախորդ",
      editClientCard: "Խմբագրել հաճախորդին",
      clientSaved: "Հաճախորդի տվյալները պահպանվել են",
      clientGroups: "Խմբեր",
      clearFilter: "Մաքրել ֆիլտրը",
      showingClients: "Ցուցադրվում է",
      clientsLabel: "հաճախորդ",
      allClients: "Բոլոր հաճախորդները",
      allClientsSubtitle: "Ամբողջ հաճախորդների բազան",
      active: "Ակտիվ",
      activeSubtitle: "Վերջերս ակտիվ կամ գրանցված",
      sleeping: "Քնած",
      sleepingSubtitle: "Կապը թարմացնելու կարիք կա",
      lost: "Կորած",
      lostSubtitle: "Երկար ժամանակ այց չի եղել",
      newClient: "Նոր",
      newSubtitle: "Նոր կամ վերջերս ստեղծված",
      withUpcomingBooking: "Առաջիկա գրանցումով",
      withUpcomingBookingSubtitle: "Ունի սպասվող այց",
      oneVisitClients: "Մեկ այցով",
      oneVisitClientsSubtitle: "Միայն մեկ այց կամ գրանցում",
      withoutBookings: "Առանց գրանցումների",
      withoutBookingsSubtitle: "Գրանցումներ դեռ չկան",
      onlineBookingClients: "Օնլայն գրանցումով",
      onlineBookingClientsSubtitle: "Ստեղծվել կամ եկել է օնլայն գրանցումից",
      debtors: "Պարտք ունեցողներ",
      debtorsSubtitle: "Բալանսը դրական է",
      vip: "VIP",
      vipSubtitle: "VIP նշումով հաճախորդներ",
      blacklist: "Սև ցուցակ",
      blacklistSubtitle: "Սահմանափակված հաճախորդներ",
      inactive: "Ոչ ակտիվ",
      fullName: "Անուն Ազգանուն",
      phone: "Հեռախոս",
      email: "Էլ․ փոստ",
      comment: "Մեկնաբանություն",
      balance: "Բալանս",
      discount: "Զեղչ",
      birthDate: "Ծննդյան օր",
      address: "Հասցե",
      status: "Կարգավիճակ",
      nonVip: "Ոչ VIP",
      notBlacklisted: "Սև ցուցակում չէ",
      noDebt: "Առանց պարտքի",
      sortBy: "Դասավորել",
      sortCreatedAt: "Ըստ ստեղծման",
      sortName: "Ըստ անվան",
      sortLastVisitDate: "Ըստ վերջին այցի",
      sortBalance: "Ըստ բալանսի",
      notes: "Նշումներ",
      lastVisitDate: "Վերջին այց",
      visitsCount: "Այցերի քանակ",
      source: "Աղբյուր",
      createdAt: "Ստեղծվել է",
      updatedAt: "Թարմացվել է",
      searchPlaceholder: "Որոնել անունով կամ հեռախոսահամարով",
      importFromExcel: "Ներմուծել Excel-ից",
      exportExcel: "Արտահանել Excel",
      exportAccess: "Արտահանել Access",
      download: "Ներբեռնել",
      chooseFile: "Ընտրել ֆայլ",
      preview: "Նախադիտում",
      confirmImport: "Հաստատել ներմուծումը",
      clearClients: "Մաքրել հաճախորդներին",
      selectAll: "Ընտրել բոլորը",
      deselectAll: "Հանել ընտրությունը",
      deleteSelected: "Ջնջել ընտրվածները",
      deleteAllClients: "Ջնջել բոլոր հաճախորդներին",
      selectedClients: "Ընտրված հաճախորդներ",
      confirmDelete: "Հաստատել ջնջումը",
      cancelDelete: "Չեղարկել",
      yesDelete: "Այո, ջնջել",
      noClientsSelected: "Հաճախորդներ ընտրված չեն",
      deleteConfirmationText: "Դուք վստահ եք, որ ցանկանում եք ջնջել ընտրված հաճախորդներին։ Այս գործողությունը հնարավոր չէ հետարկել։",
      deleteAllConfirmationText: "Դուք վստահ եք, որ ցանկանում եք ջնջել բոլոր հաճախորդներին։ Այս գործողությունը հնարավոր չէ հետարկել։",
      typeDeleteClients: "Հաստատելու համար մուտքագրեք DELETE CLIENTS",
      deleteSuccess: "Հաճախորդները հաջողությամբ ջնջվել են",
      deleteError: "Չհաջողվեց ջնջել հաճախորդներին",
      clientProfile: "Հաճախորդի քարտ",
      backToClients: "Վերադառնալ հաճախորդներին",
      overview: "Ընդհանուր",
      history: "Պատմություն",
      visits: "Այցեր",
      procedures: "Ծառայություններ",
      preparations: "Պրեպարատներ",
      bookings: "Գրանցումներ",
      addVisit: "Ավելացնել այց",
      addProcedure: "Ավելացնել ծառայություն",
      addBooking: "Ավելացնել գրանցում",
      addNote: "Ավելացնել նշում",
      addPreparation: "Ավելացնել պրեպարատ",
      preparation: "Պրեպարատ",
      amount: "Քանակ",
      unit: "Չափման միավոր",
      area: "Գոտի",
      price: "Գին",
      date: "Ամսաթիվ",
      doctorNotes: "Բժշկի նշումներ",
      procedureSaved: "Ծառայությունը պահպանվել է",
      procedureDeleted: "Ծառայությունը ջնջվել է",
      recordsPerPage: "Տողեր էջում",
      page: "Էջ",
      previous: "Նախորդ",
      next: "Հաջորդ",
      emptyTab: "Այս բաժինը դեռ տվյալներ չունի",
      editClient: "Խմբագրել",
      added: "Ավելացվել է",
      updated: "Թարմացվել է",
      skipped: "Բաց է թողնվել",
      errors: "Սխալներ",
      phoneRequired: "Հեռախոսահամարը պարտադիր է",
      invalidPhone: "Սխալ հեռախոսահամար",
      duplicateClient: "Կրկնվող հաճախորդ",
      validationStatus: "Վավերացում",
      duplicateStatus: "Կրկնվող",
      detectedColumns: "Գտնված սյունակներ",
      mappedFields: "Դաշտերի համապատասխանեցում",
      firstTwentyRows: "Առաջին 20 տողերը",
      duplicateBehavior: "Կրկնվողների մշակում",
      updateExisting: "Թարմացնել գոյություն ունեցողը",
      skipDuplicates: "Բաց թողնել կրկնվողները",
      totalRows: "Ընդամենը տողեր",
      validRows: "Վավեր տողեր",
      errorRows: "Սխալներով տողեր",
      duplicateRows: "Կրկնվող տողեր",
      importSummary: "Ներմուծման ամփոփում",
      noClients: "Հաճախորդներ դեռ չկան",
      photos: "Լուսանկարներ",
      uploadPhoto: "Վերբեռնել լուսանկար",
      before: "Մինչև",
      after: "Հետո",
      document: "Փաստաթուղթ",
      other: "Այլ",
      deletePhoto: "Ջնջել լուսանկարը",
      invalidFileType: "Սխալ ֆայլի տեսակ",
      fileTooLarge: "Ֆայլը չափազանց մեծ է",
      photoSaved: "Լուսանկարը պահպանվել է",
      photoUploaded: "Լուսանկարը վերբեռնվել է",
      photoDeleted: "Լուսանկարը ջնջվել է",
      somethingWentWrong: "Սխալ տեղի ունեցավ",
      validPhotoRequired: "Խնդրում ենք ընտրել ճիշտ ֆայլ",
      noPhotos: "Լուսանկարներ դեռ չկան",
      dropPhoto: "Քաշեք լուսանկարը այստեղ կամ ընտրեք ֆայլ",
      savePhoto: "Պահպանել լուսանկարը",
      fileHelp: "Աջակցվում են միայն .xlsx և .csv ֆայլերը մինչև 5MB։",
      selectedCountLabel: "Ընտրված է {count} հաճախորդ",
      exportSectionTitle: "Արտահանում / հաշվետվություններ",
      exportSectionSubtitle: "Excel աշխատանքային գիրք և Access-ի համար հարմար CSV ZIP ընթացիկ CRM տվյալներից։",
      crmNotesTitle: "CRM նշումներ",
      crmNotesSubtitle: "Ամսաթիվ, հեղինակ, խմբագրում, ջնջում և կարևորության նշում։",
      importantFlag: "Կարևոր",
      pinNote: "Ամրացնել նշումը",
      noServicesFound: "Ծառայություններ չկան",
      selectService: "Ընտրեք ծառայություն"
    },
    services: {
      title: "Ծառայություններ",
      subtitle: "Կառավարեք անվանումները, նկարագրությունները, կատեգորիաները, արժեքը, տևողությունը և ակտիվությունը։",
      addService: "Ավելացնել ծառայություն",
      editService: "Խմբագրել ծառայությունը",
      deleteService: "Ջնջել ծառայությունը",
      category: "Կատեգորիա",
      name: "Անվանում",
      description: "Նկարագրություն",
      duration: "Տևողություն",
      price: "Արժեք",
      active: "Ակտիվ",
      save: "Պահպանել ծառայությունը",
      priceAmd: "Արժեք AMD",
      durationMinutes: "Տևողություն րոպեներով"
    },
    schedule: {
      title: "Գրաֆիկ",
      subtitle: "Կառավարեք աշխատանքային օրերը, ժամերը, ընդմիջումները և փակ ժամերը։",
      workingDays: "Աշխատանքային օրեր",
      workingHours: "Աշխատանքային ժամեր",
      breaks: "Ընդմիջումներ",
      blockedTime: "Փակ ժամ",
      dayOff: "Հանգստյան օր",
      addBlockedTime: "Ավելացնել փակ ժամ",
      start: "Սկիզբ",
      end: "Ավարտ",
      reason: "Պատճառ",
      saveWorkingHours: "Պահպանել աշխատանքային ժամերը",
      noBreaks: "ընդմիջում չկա"
    },
    portfolio: {
      title: "Պորտֆոլիո",
      subtitle: "Կառավարեք նկարները, եռալեզու նկարագրությունները, հերթականությունը և տեսանելիությունը։",
      addPhoto: "Ավելացնել նկար",
      editCaption: "Խմբագրել նկարագրությունը",
      deletePhoto: "Ջնջել նկարը",
      changeOrder: "Փոխել հերթականությունը",
      active: "Ակտիվ",
      imageUrl: "Նկարի URL",
      caption: "Նկարագրություն",
      savePhoto: "Պահպանել նկարը",
      editPhoto: "Խմբագրել նկարը"
    },
    settings: {
      title: "Կարգավորումներ",
      subtitle: "Կլինիկայի կոնտակտները և միացված ծառայությունները։",
      address: "Հասցե",
      phone: "Հեռախոս",
      instagram: "Instagram URL",
      telegramChatId: "Telegram Chat ID",
      googleCalendarId: "Google Calendar ID",
      googleCalendarEnabled: "Google Calendar-ը միացված է",
      bookingHorizonDays: "Գրանցման օրերի քանակ",
      minBookingLeadMinutes: "Գրանցման նվազագույն ժամկետը (րոպե)",
      saveSettings: "Պահպանել կարգավորումները",
      doctorAbout: "Բժշկի մասին տեքստ",
      integrationWarning: "Եթե ծառայությունը միացված չէ, այն աշխատում է դեմո ռեժիմով․ ոչինչ չի ուղարկվում։"
    },
    sms: {
      title: "SMS կառավարում",
      subtitle: "Պլանավորված, ուղարկված SMS-ներ, ձևանմուշներ և ձեռքով ուղարկում։",
      tabScheduled: "Պլանավորված SMS",
      tabArchive: "Ուղարկված SMS",
      tabTemplates: "Ձևանմուշներ",
      tabManual: "Ձեռքով ուղարկել",
      tabSettings: "Կարգավորումներ",
      provider: "Փրովայդեր",
      autoSend: "Ավտոմատ ուղարկում",
      statusMock: "Դեմո ռեժիմ (միայն գրանցվում է)",
      statusDemo: "Դեմո ռեժիմ",
      demoModeNote:
        "Դեմո ռեժիմ. իրական SMS փրովայդերը միացված չէ, հաճախորդներին ոչինչ չի ուղարկվում։ Հաղորդագրությունները պահվում են հերթում։",
      demoNotSent: "Դեմո ռեժիմ. հաղորդագրությունը չի ուղարկվել և մնում է հերթում։",
      statusReal: "Իրական փրովայդեր",
      autoSendOn: "Միացված",
      autoSendOff: "Անջատված",
      safetyMockNote: "SMS-երը միացված չեն․ հաղորդագրությունները միայն գրանցվում են, իրականում չեն ուղարկվում։",
      safetyRealOffNote:
        "Ավտոմատ ուղարկումն անջատված է. SMS-երը ստեղծվում են հերթում, բայց չեն ուղարկվում։",
      client: "Հաճախորդ",
      phone: "Հեռախոս",
      type: "Տեսակ",
      message: "Հաղորդագրություն",
      scheduledAt: "Պլանավորված է",
      status: "Կարգավիճակ",
      sentAt: "Ուղարկվել է",
      providerColumn: "Փրովայդեր",
      error: "Սխալ",
      createdAt: "Ստեղծվել է",
      actions: "Գործողություններ",
      attempts: "Փորձեր",
      statusScheduled: "Պլանավորված",
      statusSent: "Ուղարկված",
      statusFailed: "Չհաջողվեց",
      statusCancelled: "Չեղարկված",
      statusSkipped: "Բաց թողնված",
      typeConfirmation: "Հաստատում",
      typeReminder: "Հիշեցում",
      typeCancelled: "Չեղարկում",
      typeRescheduled: "Ժամի փոփոխում",
      typeBirthday: "Ծննդյան օր",
      typeLoyalty: "Լոյալություն / առաջարկ",
      typeCustom: "Այլ",
      cancelSms: "Չեղարկել SMS-ը",
      resend: "Նորից ուղարկել",
      sendNow: "Ուղարկել հիմա",
      generateReminders: "Ստեղծել հիշեցումներ",
      remindersGenerated: "Հիշեցումները ստեղծվեցին",
      saved: "Պահպանված է",
      manualSubtitle: "Ընտրեք հաճախորդներ և ուղարկեք birthday/loyalty/custom SMS։",
      filterLabel: "Ֆիլտր",
      filterAll: "Բոլոր հաճախորդները",
      filterVip: "VIP հաճախորդներ",
      filterActive: "Ակտիվ հաճախորդներ",
      filterSleeping: "Քնած հաճախորդներ",
      filterUpcoming: "Առաջիկա գրանցումով",
      filterBirthdayWeek: "Ծնունդ այս շաբաթ",
      filterBirthdayMonth: "Ծնունդ այս ամիս",
      chooseType: "Ընտրեք տեսակը",
      chooseTemplate: "Ընտրեք ձևանմուշ",
      customMessage: "Հատուկ տեքստ",
      customMessageHint: "Օգտագործեք {{clientName}}, {{discount}} փոփոխականները։",
      discount: "Զեղչ",
      preview: "Նախադիտում",
      previewEmpty: "Ընտրեք հաճախորդ և ձևանմուշ նախադիտման համար։",
      send: "Ուղարկել",
      selectedCount: "Ընտրված է",
      selectClientsHint: "Ընտրեք առնվազն մեկ հաճախորդ։",
      confirmTitle: "Հաստատեք ուղարկումը",
      confirmText:
        "Դուք պատրաստվում եք SMS ուղարկել ընտրված հաճախորդներին։ Շարունակե՞լ։",
      recipients: "Ստացողներ",
      resultDispatched: "Ուղարկված",
      resultScheduled: "Հերթում",
      resultSkipped: "Բաց թողնված",
      resultDuplicates: "Կրկնվող",
      resultTotal: "Ընդամենը",
      noRecipients: "Հաճախորդներ ընտրված չեն",
      availableVariables: "Հասանելի փոփոխականներ",
      autoSendEnabled: "Ավտոմատ ուղարկում (իրական փրովայդեր)",
      autoSendEnabledHint: "Անվտանգության համար իրական SMS-երը կուղարկվեն միայն այն ժամանակ, երբ SMS ծառայությունը միացված լինի սերվերում։",
      reminderEnabled: "Հիշեցումների ստեղծում",
      reminderOffsets: "Հիշեցման ժամկետներ",
      offsetSameDay: "Նույն օրը",
      offset1: "1 օր առաջ",
      offset2: "2 օր առաջ",
      offset3: "3 օր առաջ",
      birthdayAutoEnabled: "Ծննդյան ավտոմատ ուղարկում",
      birthdayAutoHint: "Լռելյայն անջատված է. կարող եք ուղարկել ձեռքով։",
      noScheduled: "Պլանավորված SMS չկա",
      noLogs: "Ուղարկված SMS-եր դեռ չկան",
      refresh: "Թարմացնել",
      sendNowDisabledNote:
        "Ավտոմատ ուղարկումն անջատված է. հաղորդագրությունը մնում է հերթում։",
      selectAll: "Ընտրել բոլորը",
      deselectAll: "Հանել ընտրությունը",
      sendDisabledReal:
        "Իրական փրովայդեր՝ ավտոմատ ուղարկումն անջատված է, SMS-երը կմնան հերթում։",
      senderPhone: "Ուղարկողի համար",
      notConfigured: "կարգավորված չէ"
    },
    channels: {
      title: "Կապի ալիք",
      hint: "Որտեղ է հաճախորդը նախընտրում ստանալ հիշեցումները",
      column: "Ալիք",
      filterAll: "Բոլոր ալիքները",
      saved: "Ալիքը պահպանված է",
      statusTitle: "Հաղորդագրությունների ալիքներ",
      notConnected: "Միացված չէ՝ դեմո ռեժիմ (միայն գրանցվում է մատյանում)",
      connected: "Միացված է",
      demoExplanation: "Հաղորդագրությունները դրվում են հաճախորդի ընտրած ալիքի հերթում։ Քանի դեռ ալիքը միացված չէ, ոչինչ իրականում չի ուղարկվում։"
    },
    rating: {
      title: "Ակտիվության վարկանիշ",
      subtitle: "Լավագույն հաճախորդները՝ ըստ այցերի քանակի և ընդհանուր գումարի",
      rank: "Տեղ",
      client: "Հաճախորդ",
      visits: "Այցեր",
      spent: "Գումար",
      lastVisit: "Վերջին այց",
      activeBadge: "Ակտիվ",
      activeHint: "Այց՝ վերջին 180 օրվա ընթացքում, կամ կա առաջիկա գրանցում",
      topHint: "Տեղը ակտիվության վարկանիշում",
      empty: "Դեռ ավարտված այցեր չկան",
      allClients: "Բոլոր հաճախորդները",
      sortVisits: "Ըստ այցերի քանակի",
      sortSpent: "Ըստ գումարի",
      segment: "Խումբ",
      segmentSleeping: "Քնած",
      segmentLost: "Կորած",
      segmentNew: "Նոր"
    },
    status: {
      pending: "Սպասում է",
      confirmed: "Հաստատված",
      cancelled: "Չեղարկված",
      reschedule_requested: "Այլ ժամ է առաջարկվել",
      completed: "Ավարտված",
      no_show: "Չներկայացավ"
    },
    categories: {
      all: "Բոլորը",
      consultation: "Խորհրդատվություն",
      fillers: "Ֆիլերներ",
      lips: "Շուրթեր",
      botox: "Բոտուլինոթերապիա",
      biorevitalization: "Բիոռևիտալիզացիա",
      collagen: "Կոլագենոթերապիա",
      ultraformer: "UltraFormer",
      mesotherapy: "Մեզոթերապիա",
      skincare: "Մաշկի խնամք"
    },
    weekdays: ["Կիր", "Երկ", "Երք", "Չոր", "Հնգ", "Ուրբ", "Շաբ"],
    login: {
      passwordLabel: "Գաղտնաբառ",
      submit: "Մուտք",
      hint: "Մուտքագրեք ադմինիստրատորի գաղտնաբառը։",
      invalidPassword: "Սխալ գաղտնաբառ",
      tooManyAttempts: "Չափազանց շատ փորձեր։ Խնդրում ենք կրկին փորձել 15 րոպեից։",
      demoHint: "Դեմո ռեժիմ՝ գաղտնաբառը"
    },
    errors: {
      generic: "Ինչ-որ բան այնպես չգնաց։ Խնդրում ենք կրկին փորձել։",
      request_failed: "Հարցումը չհաջողվեց։",
      validation_failed: "Տվյալները սխալ են լրացված։",
      invalid_time: "Ժամը պետք է լինի 00:00–23:59 միջակայքում։",
      invalid_date: "Ամսաթիվը սխալ է։",
      time_range_invalid: "Սկզբի ժամը պետք է ավելի վաղ լինի, քան ավարտի ժամը։",
      break_outside_hours: "Ընդմիջումը պետք է լինի աշխատանքային ժամերի ներսում։",
      breaks_overlap: "Ընդմիջումները չպետք է համընկնեն։",
      duplicate_day: "Շաբաթվա նույն օրը նշված է երկու անգամ։",
      blocked_times_overlap: "Արգելափակված ժամերը նույն օրվա մեջ համընկնում են։",
      unauthorized: "Անհրաժեշտ է վերստին մուտք գործել։",
      invalid_phone: "Հեռախոսահամարը սխալ է։",
      client_phone_exists: "Այս հեռախոսահամարով հաճախորդ արդեն գոյություն ունի։",
      client_not_found: "Հաճախորդը չի գտնվել։",
      booking_not_found: "Գրանցումը չի գտնվել։",
      note_not_found: "Նշումը չի գտնվել։",
      photo_not_found: "Լուսանկարը չի գտնվել։",
      template_not_found: "Ձևանմուշը չի գտնվել։",
      invalid_services: "Ընտրված ծառայությունները սխալ են։",
      slot_unavailable: "Ընտրված ժամն այլևս հասանելի չէ։",
      slot_taken: "Այս ժամն արդեն զբաղված է։ Ընտրեք այլ ժամ։",
      booking_status_conflict: "Այս գործողությունը հնարավոր չէ գրանցման ընթացիկ կարգավիճակում։",
      reschedule_option_not_found: "Այս տարբերակն այլևս արդիական չէ։ Կրկին բացեք ժամերի ցանկը։",
      booking_not_owned_by_client: "Գրանցումը չի պատկանում այս հաճախորդին։",
      invalid_file_type: "Ֆայլի ձևաչափը թույլատրված չէ։",
      file_too_large: "Ֆայլը չափազանց մեծ է։",
      file_required: "Անհրաժեշտ է ընտրել ֆայլ։",
      unsupported_file: "Թույլատրվում են միայն .xlsx և .csv ֆայլերը։",
      rows_required: "Ներմուծելու տվյալներ չկան։",
      import_file_empty: "Ներմուծման ֆայլը դատարկ է։",
      booking_id_required: "Գրանցման նույնացուցիչը պարտադիր է։",
      unsupported_action: "Անհայտ գործողություն։",
      service_id_required: "Ծառայության նույնացուցիչը պարտադիր է։",
      service_in_use: "Ծառայությունը հնարավոր չէ ջնջել․ այն օգտագործվում է առաջիկա գրանցումներում։ Չեղարկեք կամ տեղափոխեք դրանք, կամ պարզապես ապաակտիվացրեք ծառայությունը։",
      confirmation_required: "Անհրաժեշտ է հաստատման տեքստը։",
      client_ids_required: "Անհրաժեշտ է ընտրել հաճախորդներ։",
      date_range_required: "Անհրաժեշտ է նշել վավեր ամսաթվերի միջակայք։",
      unsupported_export_format: "Արտահանման ձևաչափը չի աջակցվում։",
      client_id_required: "Հաճախորդի նույնացուցիչը պարտադիր է։",
      booking_not_started: "Այցը դեռ չի սկսվել․ «Չներկայացավ» կարելի է նշել միայն սկսվելուց հետո։"
    }
  },
  ru: {
    nav: {
      dashboard: "Панель",
      calendar: "Календарь",
      bookings: "Записи",
      clients: "Клиенты",
      services: "Услуги",
      schedule: "График",
      portfolio: "Портфолио",
      sms: "SMS",
      settings: "Настройки",
      logout: "Выйти",
      openSite: "Открыть сайт"
    },
    common: {
      admin: "Dr. Edgar Admin",
      search: "Поиск",
      save: "Сохранить",
      edit: "Редактировать",
      delete: "Удалить",
      active: "Активно",
      inactive: "Выключено",
      enabled: "Включено",
      disabled: "Выключено",
      remove: "Убрать",
      loading: "Загрузка...",
      saved: "Сохранено",
      none: "нет",
      all: "Все",
      add: "Добавить",
      cancel: "Отменить",
      close: "Закрыть",
      details: "Детали",
      amd: "AMD",
      minutes: "мин",
      language: "Язык"
    },
    dashboard: {
      title: "Панель",
      subtitle: "Обзор заявок, подтверждений и быстрых действий.",
      newRequests: "Новые заявки",
      todayBookings: "Записи сегодня",
      upcomingBookings: "Предстоящие записи",
      cancelledBookings: "Отмененные записи",
      quickActions: "Быстрые действия",
      latestRequests: "Последние заявки",
      sameLogic: "Действия используют ту же бизнес-логику, что и кнопки Telegram.",
      noShowBookings: "Не пришли",
      monthRevenue: "Выручка за месяц",
      monthVisits: "Визиты за месяц"
    },
    calendar: {
      title: "Календарь",
      subtitle: "Цветной CRM-календарь с деталями дня и быстрыми действиями.",
      bookingCalendar: "Календарь записей",
      today: "Сегодня",
      previousMonth: "Предыдущий месяц",
      nextMonth: "Следующий месяц",
      noBookingsThisDay: "В этот день записей нет",
      bookings: "Записи",
      details: "Детали",
      search: "Поиск",
      filterByStatus: "Фильтр по статусу",
      filterByCategory: "Фильтр по категории",
      selectedDay: "Выбранный день",
      refresh: "Обновить",
      month: "Месяц",
      week: "Неделя",
      day: "День",
      more: "еще",
      beautyCrm: "Beauty CRM",
      addBooking: "Добавить запись",
      selectClient: "Выбрать клиента",
      newClient: "Новый клиент",
      date: "Дата",
      time: "Время",
      service: "Услуга",
      confirmed: "Подтверждено",
      pendingConfirmation: "Ожидает подтверждения",
      searchClient: "Поиск клиента",
      searchClientPlaceholder: "Имя, фамилия или телефон",
      noClientsFound: "Клиент не найден. Заполните данные ниже — будет создан новый клиент.",
      clientFoundByPhone: "Клиент с этим телефоном уже есть — выбран автоматически",
      selectedClient: "Выбран клиент",
      changeClient: "Сменить",
      newClientHint: "Будет создан новый клиент",
      visits: "визитов",
      freeSlot: "Свободно",
      breakTime: "Перерыв",
      blockedTime: "Заблокировано",
      dayOff: "Выходной",
      freeSlots: "свободно",
      summaryTitle: "Итоги за период",
      summaryTotal: "Всего",
      summaryConfirmed: "Подтверждено",
      summaryPending: "Ожидают",
      summaryCancelled: "Отменено",
      summaryCompleted: "Завершено",
      summaryFreeSlots: "Свободных слотов",
      summaryFreeSlotsHint: "Свободные 30-минутные слоты по рабочим часам, без перерывов и блокировок",
      previousPeriod: "Назад",
      nextPeriod: "Вперёд",
      summaryNoShow: "Не пришли",
      endTime: "Конец"
    },
    bookings: {
      title: "Записи",
      subtitle: "Все заявки с поиском, фильтрами и действиями подтверждения.",
      client: "Клиент",
      phone: "Телефон",
      services: "Услуги",
      date: "Дата",
      time: "Время",
      duration: "Длительность",
      price: "Стоимость",
      status: "Статус",
      comment: "Комментарий",
      createdAt: "Создано",
      confirm: "Подтвердить",
      cancel: "Отменить",
      suggestAnotherTime: "Предложить другое время",
      changeDateTime: "Изменить дату/время",
      callClient: "Позвонить клиенту",
      filterByStatus: "Статус",
      filterByDate: "Дата",
      filterByCategory: "Категория",
      searchPlaceholder: "Искать по имени или телефону",
      allStatuses: "Все статусы",
      allCategories: "Все категории",
      allDates: "Все даты",
      list: "Список записей",
      googleEvent: "Google Calendar event ID",
      telegramMessage: "Telegram message ID",
      confirmedAt: "Подтверждено",
      cancelledAt: "Отменено",
      bookingId: "ID записи",
      markCompleted: "Отметить выполненной",
      createHistory: "Создать историю",
      crmDetailsTitle: "Детали CRM",
      crmDetailsSubtitle: "Фактические услуги и комментарий",
      markNoShow: "Не пришёл",
      markCameAfterAll: "Всё-таки пришёл",
      noShowNotStarted: "Можно отметить только после начала визита"
    },
    clients: {
      title: "Клиенты",
      subtitle: "Клиентская база с поиском по имени или телефону и импортом из Excel.",
      client: "Клиент",
      addClient: "Добавить клиента",
      editClientCard: "Редактировать клиента",
      clientSaved: "Данные клиента сохранены",
      clientGroups: "Группы",
      clearFilter: "Очистить фильтр",
      showingClients: "Показано",
      clientsLabel: "клиентов",
      allClients: "Все клиенты",
      allClientsSubtitle: "Вся клиентская база",
      active: "Активные",
      activeSubtitle: "Недавно активные или записанные",
      sleeping: "Спящие",
      sleepingSubtitle: "Нужно вернуть в коммуникацию",
      lost: "Потерянные",
      lostSubtitle: "Давно не было визита",
      newClient: "Новые",
      newSubtitle: "Новые или недавно созданные",
      withUpcomingBooking: "С будущей записью",
      withUpcomingBookingSubtitle: "Есть предстоящий визит",
      oneVisitClients: "С одним визитом",
      oneVisitClientsSubtitle: "Один визит или запись",
      withoutBookings: "Без записей",
      withoutBookingsSubtitle: "Записей пока нет",
      onlineBookingClients: "Онлайн-запись",
      onlineBookingClientsSubtitle: "Созданы или пришли из онлайн-записи",
      debtors: "С долгом",
      debtorsSubtitle: "Положительный баланс",
      vip: "VIP",
      vipSubtitle: "Клиенты с VIP-меткой",
      blacklist: "Черный список",
      blacklistSubtitle: "Ограниченные клиенты",
      inactive: "Неактивные",
      fullName: "Имя и фамилия",
      phone: "Телефон",
      email: "E-mail",
      comment: "Комментарий",
      balance: "Баланс",
      discount: "Скидка",
      birthDate: "Дата рождения",
      address: "Адрес",
      status: "Статус",
      nonVip: "Не VIP",
      notBlacklisted: "Не в черном списке",
      noDebt: "Без долга",
      sortBy: "Сортировка",
      sortCreatedAt: "По созданию",
      sortName: "По имени",
      sortLastVisitDate: "По последнему визиту",
      sortBalance: "По балансу",
      notes: "Заметки",
      lastVisitDate: "Последний визит",
      visitsCount: "Количество визитов",
      source: "Источник",
      createdAt: "Создано",
      updatedAt: "Обновлено",
      searchPlaceholder: "Искать по имени или телефону",
      importFromExcel: "Импорт из Excel",
      exportExcel: "Экспорт в Excel",
      exportAccess: "Экспорт для Access",
      download: "Скачать",
      chooseFile: "Выбрать файл",
      preview: "Предпросмотр",
      confirmImport: "Подтвердить импорт",
      clearClients: "Очистить клиентов",
      selectAll: "Выбрать всё",
      deselectAll: "Снять выбор",
      deleteSelected: "Удалить выбранных",
      deleteAllClients: "Удалить всех клиентов",
      selectedClients: "Выбранные клиенты",
      confirmDelete: "Подтвердить удаление",
      cancelDelete: "Отмена",
      yesDelete: "Да, удалить",
      noClientsSelected: "Клиенты не выбраны",
      deleteConfirmationText: "Вы уверены, что хотите удалить выбранных клиентов? Это действие нельзя отменить.",
      deleteAllConfirmationText: "Вы уверены, что хотите удалить всех клиентов? Это действие нельзя отменить.",
      typeDeleteClients: "Введите DELETE CLIENTS для подтверждения",
      deleteSuccess: "Клиенты успешно удалены",
      deleteError: "Не удалось удалить клиентов",
      clientProfile: "Карточка клиента",
      backToClients: "Назад к клиентам",
      overview: "Обзор",
      history: "История",
      visits: "Визиты",
      procedures: "Услуги",
      preparations: "Препараты",
      bookings: "Записи",
      addVisit: "Добавить визит",
      addProcedure: "Добавить процедуру",
      addBooking: "Добавить запись",
      addNote: "Добавить заметку",
      addPreparation: "Добавить препарат",
      preparation: "Препарат",
      amount: "Количество",
      unit: "Единица",
      area: "Зона",
      price: "Цена",
      date: "Дата",
      doctorNotes: "Заметки врача",
      procedureSaved: "Процедура сохранена",
      procedureDeleted: "Процедура удалена",
      recordsPerPage: "Строк на странице",
      page: "Страница",
      previous: "Назад",
      next: "Далее",
      emptyTab: "В этом разделе пока нет данных",
      editClient: "Редактировать",
      added: "Добавлено",
      updated: "Обновлено",
      skipped: "Пропущено",
      errors: "Ошибки",
      phoneRequired: "Телефон обязателен",
      invalidPhone: "Неверный телефон",
      duplicateClient: "Повторяющийся клиент",
      validationStatus: "Валидация",
      duplicateStatus: "Дубль",
      detectedColumns: "Найденные столбцы",
      mappedFields: "Сопоставленные поля",
      firstTwentyRows: "Первые 20 строк",
      duplicateBehavior: "Обработка дублей",
      updateExisting: "Обновлять существующих",
      skipDuplicates: "Пропускать дубли",
      totalRows: "Всего строк",
      validRows: "Корректные строки",
      errorRows: "Строки с ошибками",
      duplicateRows: "Дублирующиеся строки",
      importSummary: "Итоги импорта",
      noClients: "Клиентов пока нет",
      photos: "Фотографии",
      uploadPhoto: "Загрузить фото",
      before: "До",
      after: "После",
      document: "Документ",
      other: "Другое",
      deletePhoto: "Удалить фото",
      invalidFileType: "Неверный тип файла",
      fileTooLarge: "Файл слишком большой",
      photoSaved: "Фотография сохранена",
      photoUploaded: "Фото загружено",
      photoDeleted: "Фото удалено",
      somethingWentWrong: "Произошла ошибка",
      validPhotoRequired: "Выберите правильный файл",
      noPhotos: "Фотографий пока нет",
      dropPhoto: "Перетащите фото сюда или выберите файл",
      savePhoto: "Сохранить фото",
      fileHelp: "Поддерживаются только файлы .xlsx и .csv до 5MB.",
      selectedCountLabel: "Выбрано клиентов: {count}",
      exportSectionTitle: "Экспорт / отчёты",
      exportSectionSubtitle: "Рабочая книга Excel и совместимый с Access CSV ZIP из текущих данных CRM.",
      crmNotesTitle: "Заметки CRM",
      crmNotesSubtitle: "Дата, автор, редактирование, удаление и отметка о важности.",
      importantFlag: "Важно",
      pinNote: "Закрепить заметку",
      noServicesFound: "Услуги не найдены",
      selectService: "Выберите услугу"
    },
    services: {
      title: "Услуги",
      subtitle: "Управляйте названиями, описаниями, категориями, ценой, длительностью и активностью.",
      addService: "Добавить услугу",
      editService: "Редактировать услугу",
      deleteService: "Удалить услугу",
      category: "Категория",
      name: "Название",
      description: "Описание",
      duration: "Длительность",
      price: "Стоимость",
      active: "Активно",
      save: "Сохранить услугу",
      priceAmd: "Стоимость AMD",
      durationMinutes: "Длительность в минутах"
    },
    schedule: {
      title: "График",
      subtitle: "Управляйте рабочими днями, часами, перерывами и закрытыми слотами.",
      workingDays: "Рабочие дни",
      workingHours: "Рабочие часы",
      breaks: "Перерывы",
      blockedTime: "Закрытое время",
      dayOff: "Выходной",
      addBlockedTime: "Добавить закрытое время",
      start: "Начало",
      end: "Конец",
      reason: "Причина",
      saveWorkingHours: "Сохранить рабочие часы",
      noBreaks: "перерывов нет"
    },
    portfolio: {
      title: "Портфолио",
      subtitle: "Управляйте фото, трехъязычными подписями, порядком и видимостью.",
      addPhoto: "Добавить фото",
      editCaption: "Редактировать подпись",
      deletePhoto: "Удалить фото",
      changeOrder: "Изменить порядок",
      active: "Активно",
      imageUrl: "URL фото",
      caption: "Подпись",
      savePhoto: "Сохранить фото",
      editPhoto: "Редактировать фото"
    },
    settings: {
      title: "Настройки",
      subtitle: "Контакты клиники и подключённые сервисы.",
      address: "Адрес",
      phone: "Телефон",
      instagram: "Instagram URL",
      telegramChatId: "Telegram Chat ID",
      googleCalendarId: "Google Calendar ID",
      googleCalendarEnabled: "Google Calendar включен",
      bookingHorizonDays: "Период записи в днях",
      minBookingLeadMinutes: "Минимальный запас до записи (минуты)",
      saveSettings: "Сохранить настройки",
      doctorAbout: "Текст о враче",
      integrationWarning: "Если сервис не подключён, он работает в демо-режиме — ничего не отправляется."
    },
    sms: {
      title: "Управление SMS",
      subtitle: "Запланированные и отправленные SMS, шаблоны и ручная отправка.",
      tabScheduled: "Запланированные SMS",
      tabArchive: "Отправленные SMS",
      tabTemplates: "Шаблоны",
      tabManual: "Отправить вручную",
      tabSettings: "Настройки",
      provider: "Провайдер",
      autoSend: "Автоотправка",
      statusMock: "Демо-режим (только запись в журнал)",
      statusDemo: "Демо-режим",
      demoModeNote:
        "Демо-режим: реальный SMS-провайдер не подключён, клиентам ничего не отправляется. Сообщения сохраняются в очереди.",
      demoNotSent: "Демо-режим: сообщение не отправлено и остаётся в очереди.",
      statusReal: "Реальный провайдер",
      autoSendOn: "Включена",
      autoSendOff: "Выключена",
      safetyMockNote: "SMS не подключены: сообщения только записываются в журнал, реально не отправляются.",
      safetyRealOffNote:
        "Автоотправка выключена: SMS создаются в очереди, но не отправляются.",
      client: "Клиент",
      phone: "Телефон",
      type: "Тип",
      message: "Сообщение",
      scheduledAt: "Запланировано",
      status: "Статус",
      sentAt: "Отправлено",
      providerColumn: "Провайдер",
      error: "Ошибка",
      createdAt: "Создано",
      actions: "Действия",
      attempts: "Попытки",
      statusScheduled: "Запланировано",
      statusSent: "Отправлено",
      statusFailed: "Не удалось отправить",
      statusCancelled: "Отменено",
      statusSkipped: "Пропущено",
      typeConfirmation: "Подтверждение",
      typeReminder: "Напоминание",
      typeCancelled: "Отмена",
      typeRescheduled: "Перенос",
      typeBirthday: "День рождения",
      typeLoyalty: "Лояльность / акция",
      typeCustom: "Другое",
      cancelSms: "Отменить SMS",
      resend: "Отправить повторно",
      sendNow: "Отправить сейчас",
      generateReminders: "Создать напоминания",
      remindersGenerated: "Напоминания созданы",
      saved: "Сохранено",
      manualSubtitle: "Выберите клиентов и отправьте birthday/loyalty/custom SMS.",
      filterLabel: "Фильтр",
      filterAll: "Все клиенты",
      filterVip: "VIP клиенты",
      filterActive: "Активные клиенты",
      filterSleeping: "Спящие клиенты",
      filterUpcoming: "С будущей записью",
      filterBirthdayWeek: "День рождения на этой неделе",
      filterBirthdayMonth: "День рождения в этом месяце",
      chooseType: "Выберите тип",
      chooseTemplate: "Выберите шаблон",
      customMessage: "Свой текст",
      customMessageHint: "Используйте переменные {{clientName}}, {{discount}}.",
      discount: "Скидка",
      preview: "Предпросмотр",
      previewEmpty: "Выберите клиента и шаблон для предпросмотра.",
      send: "Отправить",
      selectedCount: "Выбрано",
      selectClientsHint: "Выберите хотя бы одного клиента.",
      confirmTitle: "Подтвердите отправку",
      confirmText:
        "Вы собираетесь отправить SMS выбранным клиентам. Продолжить?",
      recipients: "Получатели",
      resultDispatched: "Отправлено",
      resultScheduled: "В очереди",
      resultSkipped: "Пропущено",
      resultDuplicates: "Дубли",
      resultTotal: "Всего",
      noRecipients: "Клиенты не выбраны",
      availableVariables: "Доступные переменные",
      autoSendEnabled: "Автоотправка (реальный провайдер)",
      autoSendEnabledHint: "Для безопасности реальные SMS уйдут, только когда SMS-сервис будет подключён на сервере.",
      reminderEnabled: "Создание напоминаний",
      reminderOffsets: "Сроки напоминаний",
      offsetSameDay: "В день записи",
      offset1: "За 1 день",
      offset2: "За 2 дня",
      offset3: "За 3 дня",
      birthdayAutoEnabled: "Автоотправка в день рождения",
      birthdayAutoHint: "По умолчанию выключена: можно отправлять вручную.",
      noScheduled: "Нет запланированных SMS",
      noLogs: "Отправленных SMS пока нет",
      refresh: "Обновить",
      sendNowDisabledNote:
        "Автоотправка выключена: сообщение остаётся в очереди.",
      selectAll: "Выбрать всех",
      deselectAll: "Снять выбор",
      sendDisabledReal:
        "Реальный провайдер: автоотправка выключена, SMS останутся в очереди.",
      senderPhone: "Номер отправителя",
      notConfigured: "не настроен"
    },
    channels: {
      title: "Канал связи",
      hint: "Куда клиенту удобнее получать напоминания",
      column: "Канал",
      filterAll: "Все каналы",
      saved: "Канал сохранён",
      statusTitle: "Каналы сообщений",
      notConnected: "Не подключён — демо-режим (только запись в журнал)",
      connected: "Подключён",
      demoExplanation: "Сообщения ставятся в очередь в канал, выбранный клиентом. Пока канал не подключён, реально ничего не отправляется."
    },
    rating: {
      title: "Рейтинг активности",
      subtitle: "Лучшие клиенты по числу визитов и сумме",
      rank: "Место",
      client: "Клиент",
      visits: "Визиты",
      spent: "Сумма",
      lastVisit: "Последний визит",
      activeBadge: "Активный",
      activeHint: "Визит за последние 180 дней или есть будущая запись",
      topHint: "Место в рейтинге активности",
      empty: "Пока нет завершённых визитов",
      allClients: "Все клиенты",
      sortVisits: "По числу визитов",
      sortSpent: "По сумме",
      segment: "Сегмент",
      segmentSleeping: "Спящий",
      segmentLost: "Потерянный",
      segmentNew: "Новый"
    },
    status: {
      pending: "Ожидает",
      confirmed: "Подтверждено",
      cancelled: "Отменено",
      reschedule_requested: "Предложено другое время",
      completed: "Завершено",
      no_show: "Не пришёл"
    },
    categories: {
      all: "Все",
      consultation: "Консультация",
      fillers: "Филлеры",
      lips: "Губы",
      botox: "Ботулинотерапия",
      biorevitalization: "Биоревитализация",
      collagen: "Коллагенотерапия",
      ultraformer: "UltraFormer",
      mesotherapy: "Мезотерапия",
      skincare: "Уход за кожей"
    },
    weekdays: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
    login: {
      passwordLabel: "Пароль",
      submit: "Войти",
      hint: "Введите пароль администратора.",
      invalidPassword: "Неверный пароль",
      tooManyAttempts: "Слишком много попыток входа. Повторите через 15 минут.",
      demoHint: "Демо-режим, пароль:"
    },
    errors: {
      generic: "Что-то пошло не так. Пожалуйста, попробуйте ещё раз.",
      request_failed: "Не удалось выполнить запрос.",
      validation_failed: "Данные заполнены неверно.",
      invalid_time: "Время должно быть в диапазоне 00:00–23:59.",
      invalid_date: "Неверная дата.",
      time_range_invalid: "Время начала должно быть раньше времени окончания.",
      break_outside_hours: "Перерыв должен быть внутри рабочего времени.",
      breaks_overlap: "Перерывы не должны пересекаться.",
      duplicate_day: "Один и тот же день недели указан дважды.",
      blocked_times_overlap: "Заблокированные интервалы в один день пересекаются.",
      unauthorized: "Необходимо войти заново.",
      invalid_phone: "Неверный номер телефона.",
      client_phone_exists: "Клиент с таким номером телефона уже существует.",
      client_not_found: "Клиент не найден.",
      booking_not_found: "Запись не найдена.",
      note_not_found: "Заметка не найдена.",
      photo_not_found: "Фотография не найдена.",
      template_not_found: "Шаблон не найден.",
      invalid_services: "Выбранные услуги указаны неверно.",
      slot_unavailable: "Выбранное время больше недоступно.",
      slot_taken: "Это время уже занято. Выберите другое.",
      booking_status_conflict: "Это действие невозможно при текущем статусе записи.",
      reschedule_option_not_found: "Этот вариант устарел. Откройте список времени заново.",
      booking_not_owned_by_client: "Запись не принадлежит этому клиенту.",
      invalid_file_type: "Недопустимый тип файла.",
      file_too_large: "Файл слишком большой.",
      file_required: "Необходимо выбрать файл.",
      unsupported_file: "Поддерживаются только файлы .xlsx и .csv.",
      rows_required: "Нет данных для импорта.",
      import_file_empty: "Файл импорта пуст.",
      booking_id_required: "Требуется идентификатор записи.",
      unsupported_action: "Неизвестное действие.",
      service_id_required: "Требуется идентификатор услуги.",
      service_in_use: "Нельзя удалить услугу: она есть в предстоящих записях. Отмените или перенесите их, либо просто сделайте услугу неактивной.",
      confirmation_required: "Требуется текст подтверждения.",
      client_ids_required: "Необходимо выбрать клиентов.",
      date_range_required: "Необходимо указать корректный диапазон дат.",
      unsupported_export_format: "Формат экспорта не поддерживается.",
      client_id_required: "Требуется идентификатор клиента.",
      booking_not_started: "Визит ещё не начался — «Не пришёл» можно отметить только после начала."
    }
  },
  en: {
    nav: {
      dashboard: "Dashboard",
      calendar: "Calendar",
      bookings: "Bookings",
      clients: "Clients",
      services: "Services",
      schedule: "Schedule",
      portfolio: "Portfolio",
      sms: "SMS",
      settings: "Settings",
      logout: "Logout",
      openSite: "Open site"
    },
    common: {
      admin: "Dr. Edgar Admin",
      search: "Search",
      save: "Save",
      edit: "Edit",
      delete: "Delete",
      active: "Active",
      inactive: "Inactive",
      enabled: "Enabled",
      disabled: "Disabled",
      remove: "Remove",
      loading: "Loading...",
      saved: "Saved",
      none: "none",
      all: "All",
      add: "Add",
      cancel: "Cancel",
      close: "Close",
      details: "Details",
      amd: "AMD",
      minutes: "min",
      language: "Language"
    },
    dashboard: {
      title: "Dashboard",
      subtitle: "Operational overview for requests, confirmations, and quick admin actions.",
      newRequests: "New requests",
      todayBookings: "Today bookings",
      upcomingBookings: "Upcoming bookings",
      cancelledBookings: "Cancelled bookings",
      quickActions: "Quick actions",
      latestRequests: "Latest requests",
      sameLogic: "Actions use the same business logic as Telegram buttons.",
      noShowBookings: "No-shows",
      monthRevenue: "Revenue this month",
      monthVisits: "Visits this month"
    },
    calendar: {
      title: "Calendar",
      subtitle: "Color-coded CRM calendar with day details and quick actions.",
      bookingCalendar: "Booking calendar",
      today: "Today",
      previousMonth: "Previous month",
      nextMonth: "Next month",
      noBookingsThisDay: "No bookings this day",
      bookings: "Bookings",
      details: "Details",
      search: "Search",
      filterByStatus: "Filter by status",
      filterByCategory: "Filter by category",
      selectedDay: "Selected day",
      refresh: "Refresh",
      month: "Month",
      week: "Week",
      day: "Day",
      more: "more",
      beautyCrm: "Beauty CRM",
      addBooking: "Add booking",
      selectClient: "Select client",
      newClient: "New client",
      date: "Date",
      time: "Time",
      service: "Service",
      confirmed: "Confirmed",
      pendingConfirmation: "Pending confirmation",
      searchClient: "Find a client",
      searchClientPlaceholder: "Name, surname or phone",
      noClientsFound: "No client found. Fill in the details below to create a new client.",
      clientFoundByPhone: "A client with this phone already exists and was selected automatically",
      selectedClient: "Selected client",
      changeClient: "Change",
      newClientHint: "A new client will be created",
      visits: "visits",
      freeSlot: "Free",
      breakTime: "Break",
      blockedTime: "Blocked",
      dayOff: "Day off",
      freeSlots: "free",
      summaryTitle: "Summary for the period",
      summaryTotal: "Total",
      summaryConfirmed: "Confirmed",
      summaryPending: "Pending",
      summaryCancelled: "Cancelled",
      summaryCompleted: "Completed",
      summaryFreeSlots: "Free slots",
      summaryFreeSlotsHint: "Free 30-minute slots within working hours, excluding breaks and blocked time",
      previousPeriod: "Previous",
      nextPeriod: "Next",
      summaryNoShow: "No-shows",
      endTime: "End"
    },
    bookings: {
      title: "Bookings",
      subtitle: "All requests with search, filters, and confirmation actions.",
      client: "Client",
      phone: "Phone",
      services: "Services",
      date: "Date",
      time: "Time",
      duration: "Duration",
      price: "Price",
      status: "Status",
      comment: "Comment",
      createdAt: "Created at",
      confirm: "Confirm",
      cancel: "Cancel",
      suggestAnotherTime: "Suggest another time",
      changeDateTime: "Change date/time",
      callClient: "Call client",
      filterByStatus: "Status",
      filterByDate: "Date",
      filterByCategory: "Category",
      searchPlaceholder: "Search by name or phone",
      allStatuses: "All statuses",
      allCategories: "All categories",
      allDates: "All dates",
      list: "Booking list",
      googleEvent: "Google Calendar event ID",
      telegramMessage: "Telegram message ID",
      confirmedAt: "Confirmed at",
      cancelledAt: "Cancelled at",
      bookingId: "Booking ID",
      markCompleted: "Mark completed",
      createHistory: "Create history",
      crmDetailsTitle: "CRM details",
      crmDetailsSubtitle: "Actual services and comment",
      markNoShow: "No-show",
      markCameAfterAll: "Came after all",
      noShowNotStarted: "Available only after the visit has started"
    },
    clients: {
      title: "Clients",
      subtitle: "Client database with name or phone search and Excel import.",
      client: "Client",
      addClient: "Add client",
      editClientCard: "Edit client",
      clientSaved: "Client saved",
      clientGroups: "Groups",
      clearFilter: "Clear filter",
      showingClients: "Showing",
      clientsLabel: "clients",
      allClients: "All clients",
      allClientsSubtitle: "Full client database",
      active: "Active",
      activeSubtitle: "Recently active or booked",
      sleeping: "Sleeping",
      sleepingSubtitle: "Needs follow-up",
      lost: "Lost",
      lostSubtitle: "No visit for a long time",
      newClient: "New",
      newSubtitle: "New or recently created",
      withUpcomingBooking: "With upcoming booking",
      withUpcomingBookingSubtitle: "Has a future appointment",
      oneVisitClients: "One-visit clients",
      oneVisitClientsSubtitle: "One visit or booking",
      withoutBookings: "Without bookings",
      withoutBookingsSubtitle: "No bookings yet",
      onlineBookingClients: "Online booking clients",
      onlineBookingClientsSubtitle: "Created from online booking",
      debtors: "Debtors",
      debtorsSubtitle: "Positive balance",
      vip: "VIP",
      vipSubtitle: "Clients marked VIP",
      blacklist: "Blacklist",
      blacklistSubtitle: "Restricted clients",
      inactive: "Inactive",
      fullName: "Full name",
      phone: "Phone",
      email: "Email",
      comment: "Comment",
      balance: "Balance",
      discount: "Discount",
      birthDate: "Birth date",
      address: "Address",
      status: "Status",
      nonVip: "Not VIP",
      notBlacklisted: "Not blacklisted",
      noDebt: "No debt",
      sortBy: "Sort by",
      sortCreatedAt: "Created at",
      sortName: "Name",
      sortLastVisitDate: "Last visit",
      sortBalance: "Balance",
      notes: "Notes",
      lastVisitDate: "Last visit",
      visitsCount: "Visits",
      source: "Source",
      createdAt: "Created at",
      updatedAt: "Updated at",
      searchPlaceholder: "Search by name or phone",
      importFromExcel: "Import from Excel",
      exportExcel: "Export to Excel",
      exportAccess: "Export for Access",
      download: "Download",
      chooseFile: "Choose file",
      preview: "Preview",
      confirmImport: "Confirm import",
      clearClients: "Clear clients",
      selectAll: "Select all",
      deselectAll: "Deselect all",
      deleteSelected: "Delete selected",
      deleteAllClients: "Delete all clients",
      selectedClients: "Selected clients",
      confirmDelete: "Confirm delete",
      cancelDelete: "Cancel",
      yesDelete: "Yes, delete",
      noClientsSelected: "No clients selected",
      deleteConfirmationText: "Are you sure you want to delete the selected clients? This action cannot be undone.",
      deleteAllConfirmationText: "Are you sure you want to delete all clients? This action cannot be undone.",
      typeDeleteClients: "Type DELETE CLIENTS to confirm",
      deleteSuccess: "Clients deleted successfully",
      deleteError: "Failed to delete clients",
      clientProfile: "Client profile",
      backToClients: "Back to clients",
      overview: "Overview",
      history: "History",
      visits: "Visits",
      procedures: "Procedures",
      preparations: "Preparations",
      bookings: "Bookings",
      addVisit: "Add visit",
      addProcedure: "Add procedure",
      addBooking: "Add booking",
      addNote: "Add note",
      addPreparation: "Add preparation",
      preparation: "Preparation",
      amount: "Amount",
      unit: "Unit",
      area: "Area",
      price: "Price",
      date: "Date",
      doctorNotes: "Doctor notes",
      procedureSaved: "Procedure saved",
      procedureDeleted: "Procedure deleted",
      recordsPerPage: "Rows per page",
      page: "Page",
      previous: "Previous",
      next: "Next",
      emptyTab: "No data in this section yet",
      editClient: "Edit",
      added: "Added",
      updated: "Updated",
      skipped: "Skipped",
      errors: "Errors",
      phoneRequired: "Phone required",
      invalidPhone: "Invalid phone",
      duplicateClient: "Duplicate client",
      validationStatus: "Validation",
      duplicateStatus: "Duplicate",
      detectedColumns: "Detected columns",
      mappedFields: "Mapped fields",
      firstTwentyRows: "First 20 rows",
      duplicateBehavior: "Duplicate handling",
      updateExisting: "Update existing",
      skipDuplicates: "Skip duplicates",
      totalRows: "Total rows",
      validRows: "Valid rows",
      errorRows: "Rows with errors",
      duplicateRows: "Duplicate rows",
      importSummary: "Import summary",
      noClients: "No clients yet",
      photos: "Photos",
      uploadPhoto: "Upload photo",
      before: "Before",
      after: "After",
      document: "Document",
      other: "Other",
      deletePhoto: "Delete photo",
      invalidFileType: "Invalid file type",
      fileTooLarge: "File too large",
      photoSaved: "Photo saved",
      photoUploaded: "Photo uploaded",
      photoDeleted: "Photo deleted",
      somethingWentWrong: "Something went wrong",
      validPhotoRequired: "Please choose a valid file",
      noPhotos: "No photos yet",
      dropPhoto: "Drop a photo here or choose a file",
      savePhoto: "Save photo",
      fileHelp: "Only .xlsx and .csv files up to 5MB are supported.",
      selectedCountLabel: "Selected clients: {count}",
      exportSectionTitle: "Export / reports",
      exportSectionSubtitle: "Excel workbook and Access-compatible CSV ZIP from current CRM data.",
      crmNotesTitle: "CRM notes",
      crmNotesSubtitle: "Date, author, edit, delete, and important flag.",
      importantFlag: "Important",
      pinNote: "Pin note",
      noServicesFound: "No services found",
      selectService: "Select a service"
    },
    services: {
      title: "Services",
      subtitle: "Manage procedure names, descriptions, categories, prices, duration, and active state.",
      addService: "Add service",
      editService: "Edit service",
      deleteService: "Delete service",
      category: "Category",
      name: "Name",
      description: "Description",
      duration: "Duration",
      price: "Price",
      active: "Active",
      save: "Save service",
      priceAmd: "Price AMD",
      durationMinutes: "Duration minutes"
    },
    schedule: {
      title: "Schedule",
      subtitle: "Manage working days, hours, breaks, blocked times, and days off.",
      workingDays: "Working days",
      workingHours: "Working hours",
      breaks: "Breaks",
      blockedTime: "Blocked time",
      dayOff: "Day off",
      addBlockedTime: "Add blocked time",
      start: "Start",
      end: "End",
      reason: "Reason",
      saveWorkingHours: "Save working hours",
      noBreaks: "no breaks"
    },
    portfolio: {
      title: "Portfolio",
      subtitle: "Manage work photos, multilingual captions, order, and visibility.",
      addPhoto: "Add photo",
      editCaption: "Edit caption",
      deletePhoto: "Delete photo",
      changeOrder: "Change order",
      active: "Active",
      imageUrl: "Image URL",
      caption: "Caption",
      savePhoto: "Save photo",
      editPhoto: "Edit photo"
    },
    settings: {
      title: "Settings",
      subtitle: "Clinic contacts and connected services.",
      address: "Address",
      phone: "Phone",
      instagram: "Instagram URL",
      telegramChatId: "Telegram Chat ID",
      googleCalendarId: "Google Calendar ID",
      googleCalendarEnabled: "Google Calendar enabled",
      bookingHorizonDays: "Booking horizon days",
      minBookingLeadMinutes: "Minimum booking notice (minutes)",
      saveSettings: "Save settings",
      doctorAbout: "Doctor about text",
      integrationWarning: "If a service is not connected, it runs in demo mode and nothing is sent."
    },
    sms: {
      title: "SMS management",
      subtitle: "Scheduled and sent SMS, templates, and manual sending.",
      tabScheduled: "Scheduled SMS",
      tabArchive: "Sent SMS",
      tabTemplates: "Templates",
      tabManual: "Send manually",
      tabSettings: "Settings",
      provider: "Provider",
      autoSend: "Auto-send",
      statusMock: "Demo mode (log only)",
      statusDemo: "Demo mode",
      demoModeNote:
        "Demo mode: no real SMS provider is connected, nothing is sent to clients. Messages are kept in the queue.",
      demoNotSent: "Demo mode: the message was not sent and stays in the queue.",
      statusReal: "Real provider",
      autoSendOn: "Enabled",
      autoSendOff: "Disabled",
      safetyMockNote: "SMS is not connected: messages are only logged, nothing is really sent.",
      safetyRealOffNote:
        "Auto-send is disabled: SMS are created in the queue but not sent.",
      client: "Client",
      phone: "Phone",
      type: "Type",
      message: "Message",
      scheduledAt: "Scheduled at",
      status: "Status",
      sentAt: "Sent at",
      providerColumn: "Provider",
      error: "Error",
      createdAt: "Created at",
      actions: "Actions",
      attempts: "Attempts",
      statusScheduled: "Scheduled",
      statusSent: "Sent",
      statusFailed: "Failed to send",
      statusCancelled: "Cancelled",
      statusSkipped: "Skipped",
      typeConfirmation: "Confirmation",
      typeReminder: "Reminder",
      typeCancelled: "Cancellation",
      typeRescheduled: "Reschedule",
      typeBirthday: "Birthday",
      typeLoyalty: "Loyalty / offer",
      typeCustom: "Custom",
      cancelSms: "Cancel SMS",
      resend: "Resend",
      sendNow: "Send now",
      generateReminders: "Generate reminders",
      remindersGenerated: "Reminders generated",
      saved: "Saved",
      manualSubtitle: "Select clients and send birthday/loyalty/custom SMS.",
      filterLabel: "Filter",
      filterAll: "All clients",
      filterVip: "VIP clients",
      filterActive: "Active clients",
      filterSleeping: "Sleeping clients",
      filterUpcoming: "With upcoming booking",
      filterBirthdayWeek: "Birthday this week",
      filterBirthdayMonth: "Birthday this month",
      chooseType: "Choose type",
      chooseTemplate: "Choose template",
      customMessage: "Custom text",
      customMessageHint: "Use {{clientName}}, {{discount}} variables.",
      discount: "Discount",
      preview: "Preview",
      previewEmpty: "Select a client and template to preview.",
      send: "Send",
      selectedCount: "Selected",
      selectClientsHint: "Select at least one client.",
      confirmTitle: "Confirm sending",
      confirmText:
        "You are about to send SMS to the selected clients. Continue?",
      recipients: "Recipients",
      resultDispatched: "Sent",
      resultScheduled: "Queued",
      resultSkipped: "Skipped",
      resultDuplicates: "Duplicates",
      resultTotal: "Total",
      noRecipients: "No clients selected",
      availableVariables: "Available variables",
      autoSendEnabled: "Auto-send (real provider)",
      autoSendEnabledHint: "For safety, real SMS go out only once an SMS service is connected on the server.",
      reminderEnabled: "Generate reminders",
      reminderOffsets: "Reminder timing",
      offsetSameDay: "Same day",
      offset1: "1 day before",
      offset2: "2 days before",
      offset3: "3 days before",
      birthdayAutoEnabled: "Birthday auto-send",
      birthdayAutoHint: "Disabled by default: you can send manually.",
      noScheduled: "No scheduled SMS",
      noLogs: "No sent SMS yet",
      refresh: "Refresh",
      sendNowDisabledNote:
        "Auto-send is disabled: the message stays in the queue.",
      selectAll: "Select all",
      deselectAll: "Deselect all",
      sendDisabledReal:
        "Real provider: auto-send is off, SMS will stay in the queue.",
      senderPhone: "Sender number",
      notConfigured: "not configured"
    },
    channels: {
      title: "Contact channel",
      hint: "Where the client prefers to get reminders",
      column: "Channel",
      filterAll: "All channels",
      saved: "Channel saved",
      statusTitle: "Message channels",
      notConnected: "Not connected — demo mode (log only)",
      connected: "Connected",
      demoExplanation: "Messages are queued in the channel the client chose. Until a channel is connected, nothing is really sent."
    },
    rating: {
      title: "Activity rating",
      subtitle: "Top clients by number of visits and total spent",
      rank: "Rank",
      client: "Client",
      visits: "Visits",
      spent: "Total",
      lastVisit: "Last visit",
      activeBadge: "Active",
      activeHint: "Visited in the last 180 days or has an upcoming booking",
      topHint: "Place in the activity rating",
      empty: "No completed visits yet",
      allClients: "All clients",
      sortVisits: "By number of visits",
      sortSpent: "By total spent",
      segment: "Segment",
      segmentSleeping: "Sleeping",
      segmentLost: "Lost",
      segmentNew: "New"
    },
    status: {
      pending: "Pending",
      confirmed: "Confirmed",
      cancelled: "Cancelled",
      reschedule_requested: "Reschedule requested",
      completed: "Completed",
      no_show: "No-show"
    },
    categories: {
      all: "All",
      consultation: "Consultation",
      fillers: "Fillers",
      lips: "Lips",
      botox: "Botulinum therapy",
      biorevitalization: "Biorevitalization",
      collagen: "Collagen therapy",
      ultraformer: "UltraFormer",
      mesotherapy: "Mesotherapy",
      skincare: "Skin care"
    },
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    login: {
      passwordLabel: "Password",
      submit: "Login",
      hint: "Enter the administrator password.",
      invalidPassword: "Invalid password",
      tooManyAttempts: "Too many login attempts. Try again in 15 minutes.",
      demoHint: "Demo mode, password:"
    },
    errors: {
      generic: "Something went wrong. Please try again.",
      request_failed: "Request failed.",
      validation_failed: "Some fields are invalid.",
      invalid_time: "Time must be between 00:00 and 23:59.",
      invalid_date: "Invalid date.",
      time_range_invalid: "Start time must be earlier than end time.",
      break_outside_hours: "A break must be within working hours.",
      breaks_overlap: "Breaks must not overlap.",
      duplicate_day: "The same day of the week is listed twice.",
      blocked_times_overlap: "Blocked times on the same date overlap.",
      unauthorized: "Please sign in again.",
      invalid_phone: "Invalid phone number.",
      client_phone_exists: "A client with this phone number already exists.",
      client_not_found: "Client not found.",
      booking_not_found: "Booking not found.",
      note_not_found: "Note not found.",
      photo_not_found: "Photo not found.",
      template_not_found: "Template not found.",
      invalid_services: "Selected services are invalid.",
      slot_unavailable: "The selected time is no longer available.",
      slot_taken: "This time is already taken. Choose another one.",
      booking_status_conflict: "This action isn't allowed for the booking's current status.",
      reschedule_option_not_found: "This option is out of date. Open the list of times again.",
      booking_not_owned_by_client: "This booking doesn't belong to this client.",
      invalid_file_type: "This file type isn't allowed.",
      file_too_large: "The file is too large.",
      file_required: "Please choose a file.",
      unsupported_file: "Only .xlsx and .csv files are supported.",
      rows_required: "There is no data to import.",
      import_file_empty: "The import file is empty.",
      booking_id_required: "Booking ID is required.",
      unsupported_action: "Unknown action.",
      service_id_required: "Service ID is required.",
      service_in_use: "This service cannot be deleted: it is part of upcoming bookings. Cancel or move them, or simply deactivate the service.",
      confirmation_required: "Confirmation text is required.",
      client_ids_required: "Please select clients.",
      date_range_required: "A valid date range is required.",
      unsupported_export_format: "Export format is not supported.",
      client_id_required: "Client ID is required.",
      booking_not_started: "The visit has not started yet; a no-show can only be marked after it starts."
    }
  }
};
