type TranslationShape<T> = {
    [Key in keyof T]: T[Key] extends string
    ? string
    : TranslationShape<T[Key]>;
};

export const enUS = {
    common: {
        appName: "Academy Platform",

        actions: {
            add: "Add",
            create: "Create",
            edit: "Edit",
            update: "Update",
            updating: "Updating...",
            save: "Save",
            saveChanges: "Save changes",
            saving: "Saving...",
            delete: "Delete",
            remove: "Remove",
            cancel: "Cancel",
            close: "Close",
            confirm: "Confirm",
            view: "View",
            viewSchedule: "View schedule",
            details: "Details",
            search: "Search",
            clear: "Clear",
            filter: "Filter",
            reset: "Reset",
            refresh: "Refresh",
            download: "Download",
            upload: "Upload",
            uploading: "Uploading...",
            submit: "Submit",
            submitting: "Submitting...",
            publish: "Publish",
            publishing: "Publishing...",
            activate: "Activate",
            deactivate: "Deactivate",
            archive: "Archive",
            restore: "Restore",
            regenerate: "Regenerate",
            assign: "Assign",
            link: "Link",
            unlink: "Unlink",
            finalize: "Finalize",
            initialize: "Initialize",
            start: "Start",
            complete: "Complete",
            postpone: "Postpone",
            suspend: "Suspend",
            reactivate: "Reactivate",
            invite: "Invite",
            copy: "Copy",
            copied: "Copied",
            open: "Open",
            back: "Back",
            next: "Next",
            previous: "Previous",
            signIn: "Sign in",
            signOut: "Sign out",
            joined: "Joined"
        },

        fields: {
            name: "Name",
            firstName: "First name",
            lastName: "Last name",
            fullName: "Full name",
            code: "Code",
            number: "Number",
            title: "Title",
            description: "Description",
            status: "Status",
            actions: "Actions",
            email: "Email",
            password: "Password",
            temporaryPassword: "Temporary password",
            phone: "Phone",
            alternatePhone: "Alternate phone",
            address: "Address",
            addressLine1: "Address line 1",
            addressLine2: "Address line 2",
            city: "City",
            stateProvince: "State or province",
            postalCode: "Postal code",
            country: "Country",
            countryCode: "Country code",
            timezone: "Timezone",
            locale: "Language",
            startDate: "Start date",
            endDate: "End date",
            dateFrom: "Date from",
            dateTo: "Date to",
            startTime: "Start time",
            endTime: "End time",
            date: "Date",
            time: "Time",
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
            curriculum: "Curriculum",
            evaluation: "Evaluation",
            attendance: "Attendance",
            location: "Location",
            role: "Role",
            roles: "Roles",
            permission: "Permission",
            permissions: "Permissions",
            capacity: "Capacity",
            ageRange: "Age range",
            minimumAge: "Minimum age",
            maximumAge: "Maximum age",
            notes: "Notes",
            comment: "Comment",
            reason: "Reason",
            sequence: "Sequence",
            weight: "Weight",
            score: "Score",
            overallScore: "Overall score",
            passingScore: "Passing score",
            minimumScore: "Minimum score",
            maximumScore: "Maximum score",
            progress: "Progress",
            percentage: "Percentage",
            createdAt: "Created at",
            updatedAt: "Updated at",
            completedAt: "Completed at",
            expiresAt: "Expires at",
            instructor: "Instructor",
            image: "Image",
            video: "Video",
            document: "Document",
            images: "Images",
            videos: "Videos",
            documents: "Documents"
        },

        statuses: {
            ACTIVE: "Active",
            INACTIVE: "Inactive",
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
            PRIMARY_INSTRUCTOR: "Primary instructor",
            ASSISTANT_INSTRUCTOR: "Assistant instructor",
            NEEDS_SUPPORT: "Needs support",
            DEVELOPING: "Developing",
            ON_TRACK: "On track",
            EXCEEDING_EXPECTATIONS: "Exceeding expectations",
            NO_DATA: "No data",
            UNSPECIFIED: "Unspecified",
            FEMALE: "Female",
            MALE: "Male"
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
            requiredFields:
                "Please complete all required fields.",
            unexpectedError:
                "An unexpected error occurred.",
            noPermission:
                "You do not have permission to perform this action.",
            changesSaved:
                "Your changes were saved successfully.",
        },

        filters: {
            all: "All",
            includeArchived: "Include archived",
            allStatuses: "All statuses",
            allPrograms: "All programs",
            allGroups: "All groups",
            allTerms: "All terms",
            allBranches: "All branches",
            allTypes: "All types",
            searchPlaceholder: "Search...",
        },

        pagination: {
            page: "Page",
            of: "of",
            total: "Total",
            records: "records",
        },

        dialogs: {
            confirmTitle: "Confirm action",

            deleteTitle: "Delete record",
            deleteDescription:
                "This operation may permanently delete the record.",

            archiveTitle: "Archive record",
            archiveDescription:
                "The record will no longer appear in active lists.",

            unlinkTitle: "Remove connection",
            unlinkDescription:
                "The connection will be removed, but the original records will remain.",

            publishTitle: "Publish evaluation",
            publishDescription:
                "The evaluation will become visible in student and guardian reports.",

            finalizeAttendanceTitle: "Finalize attendance",
            finalizeAttendanceDescription:
                "Normal attendance editing will be locked after finalization.",

            suspendTitle: "Suspend account",
            suspendDescription:
                "The user will lose access until the account is reactivated.",

            cancelTitle: "Cancel operation",
            regenerateTitle: "Regenerate report",
            regenerateDescription:
                "A new report export will be generated.",
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

    pages: {
        login: {
            title: "Sign in",
            description: "Sign in to your organization.",
            organization: "Organization",
            forgotPassword: "Forgot password?",
            signingIn: "Signing in...",
            invalidCredentials:
                "The organization, email, or password is incorrect.",
        },

        dashboard: {
            administratorTitle: "Administrator dashboard",
            instructorTitle: "Instructor dashboard",
            welcome: "Welcome",
            activeStudents: "Active students",
            activeGroups: "Active groups",
            activeStaff: "Active staff",
            loading: "Loading dashboard analytics...",
            loadFailiure: "Dashboard analytics could not be loaded.",
            activeCurricula: "Active curricula",
            upcomingSessions: "Upcoming sessions",
            upcomingSessionsDescription: "The next scheduled lessons or training sessions.",
            missingAttendance: "Missing attendance",
            draftEvaluations: "Draft evaluations",
            pendingPublication: "Pending publication",
            publishedEvaluations: "Published evaluations",
            noUpcomingSessions:
                "No upcoming sessions were found.",
        },

        users: {
            title: "Organization users",
            description:
                "Manage administrators, instructors, coaches, teachers, and guardians.",

            create: "Create active user",
            invite: "Invite user",

            searchPlaceholder: "Search by name or email",

            empty: "No users were found.",
            loading: "Loading users...",
            loadError: "Users could not be loaded.",

            sessionLoading: "Loading user session...",
            sessionLoadError:
                "Your session could not be loaded.",

            saveError: "The user could not be saved.",

            suspendTitle: "Suspend user",
            suspendDescription:
                "Suspend {name}? The user's active session will be invalidated and they will lose access until reactivated.",
            suspendError:
                "The user could not be suspended.",

            reactivateTitle: "Reactivate user",
            reactivateDescription:
                "Reactivate {name}? The user will be able to sign in again.",
            reactivateError:
                "The user could not be reactivated.",

            totalUsers: "{count} users",
            pageInformation: "Page {page} of {totalPages}",

            editTitle: "Edit organization user",
            invitationCreated: "Invitation created",
            invitationUrl: "Invitation URL",
            invitationExpires: "The invitation expires on {date}.",
            invitationSecurityWarning:
                "This URL contains a security token. Do not publish it or store it in application logs.",

            user: "User",
            roles: "Roles",
            lastLogin: "Last login",
            neverLoggedIn: "Never",

            createActiveUser: "Create active user",
            inviteUser: "Invite user",
            editUser: "Edit user",

            organizationAccount: "Organization account",
            temporaryPassword: "Temporary password",
            selectRole: "Select at least one role.",
        },

        branches: {
            title: "Branches",
            description:
                "Manage campuses, offices, and training locations.",
            create: "Create branch",
            edit: "Edit branch",
            empty: "No branches were found.",
            notAssigned: "No branch assignment",
            loading: "Loading branches...",
            includeArchived: "Include archived branches",
            contact: "Contact",
            code: "Branch code",
            name: "Branch name",
            save: "Save branch",
        },

        staff: {
            title: "Staff",
            description:
                "Manage instructors, coaches, teachers, and other organization staff.",

            create: "Create staff profile",
            edit: "Edit staff profile",

            empty: "No staff profiles were found.",
            loading: "Loading staff...",
            loadError: "Staff profiles could not be loaded.",

            sessionLoading: "Loading user session...",
            sessionLoadError:
                "Your session could not be loaded.",

            searchPlaceholder: "Search staff",
            includeArchived: "Include archived staff",

            saveError:
                "The staff profile could not be saved.",

            statusChangeTitle: "Change employment status",
            statusChangeDescription:
                "Change {name}'s employment status from {currentStatus} to {newStatus}?",
            statusChangeError:
                "The employment status could not be changed.",

            staff: "Staff member",
            staffNumber: "Staff number",
            specialization: "Specialization",
            employmentStatus: "Employment status",
            branch: "Branch",
            instructorAccount: "Instructor account",
            selectInstructorAccount:
                "Select an instructor account",
            noEligibleAccount:
                "No eligible instructor account is available. Create or invite an instructor from the Users page first.",

            titleField: "Title",
            hireDate: "Hire date",
            employmentEndDate: "Employment end date",
            biography: "Biography",

            noBranchAssignment: "No branch assignment",
            titlePlaceholder: "Senior Coach",
            specializationPlaceholder:
                "Football, English, Piano",

            createSuccess:
                "The staff profile was created successfully.",
            updateSuccess:
                "The staff profile was updated successfully.",
        },

        guardians: {
            title: "Guardians",
            description:
                "Manage parent and legal guardian profiles.",

            create: "Create guardian profile",
            edit: "Edit guardian profile",

            empty: "No guardian profiles were found.",
            loading: "Loading guardians...",
            loadError:
                "Guardian profiles could not be loaded.",

            sessionLoading: "Loading user session...",
            sessionLoadError:
                "Your session could not be loaded.",

            searchPlaceholder: "Search guardians",
            includeArchived:
                "Include archived guardians",

            saveError:
                "The guardian profile could not be saved.",

            statusChangeError:
                "The guardian status could not be changed.",

            statusChangeTitle:
                "Change guardian status",

            statusChangeDescription:
                "Change {name}'s status from {currentStatus} to {newStatus}?",

            guardian: "Guardian",
            guardianNumber: "Guardian number",
            number: "Number",
            contact: "Contact",
            location: "Location",
            occupation: "Occupation",
            alternatePhone: "Alternate phone",

            noEligibleAccount:
                "No eligible guardian account is available. Create or invite a guardian from the Users page first.",

            guardianAccount: "Guardian account",
            selectGuardianAccount:
                "Select a guardian account",

            notes: "Notes",
        },

        students: {
            title: "Students",
            description:
                "Manage student records, emergency information, and guardian relationships.",
            create: "Create student",
            edit: "Edit student",
            empty: "No students were found.",
            loading: "Loading students...",
            searchPlaceholder:
                "Search by name or student number",
            studentNumber: "Student number",
            birthDate: "Birth date",
            gender: "Gender",
            enrollmentDate: "Enrollment date",
            emergencyInformation: "Emergency information",
            emergencyContact: "Emergency contact",
            emergencyPhone: "Emergency contact phone",
            medicalInformation: "Medical information",
            allergies: "Allergies",
            medicalNotes: "Medical notes",
            generalNotes: "General notes",
            guardianCount: "Guardians",
            linkGuardian: "Link guardian",
            relationship: "Relationship",
            primaryContact: "Primary contact",
            legalGuardian: "Legal guardian",
            pickupAuthorized: "Pickup authorized",
            receivesNotifications: "Receives notifications",
            internalMediaConsent: "Internal media consent",
            marketingMediaConsent: "Marketing media consent",
        },

        programs: {
            title: "Programs",
            description:
                "Manage sports, subjects, departments, and activity categories.",

            create: "Create program",
            edit: "Edit program",
            select: "Select program",

            empty: "No programs were found.",
            loading: "Loading programs...",
            loadError: "Programs could not be loaded.",

            sessionLoading: "Loading user session...",
            sessionLoadError:
                "Your session could not be loaded.",

            searchPlaceholder: "Search programs",
            includeArchived: "Include archived programs",

            saveError:
                "The program could not be saved.",

            statusChangeTitle: "Change program status",
            statusChangeDescription:
                "Change {name}'s status from {currentStatus} to {newStatus}?",
            statusChangeError:
                "The program status could not be changed.",

            program: "Program",
            category: "Category",
            ageRange: "Age range",
            noAgeRestriction: "No age restriction",

            programCode: "Program code",
            programName: "Program name",
            minimumAge: "Minimum age",
            maximumAge: "Maximum age",

            categoryPlaceholder:
                "SPORT, LANGUAGE, MUSIC",

            createSuccess:
                "The program was created successfully.",
            updateSuccess:
                "The program was updated successfully.",
        },

        terms: {
            title: "Terms",
            description:
                "Manage academic years, semesters, and activity periods.",

            create: "Create term",
            edit: "Edit term",

            empty: "No terms were found.",
            loading: "Loading terms...",
            loadError: "Terms could not be loaded.",

            sessionLoading: "Loading user session...",
            sessionLoadError:
                "Your session could not be loaded.",

            searchPlaceholder: "Search terms",
            includeArchived: "Include archived terms",

            saveError: "The term could not be saved.",

            statusChangeTitle: "Change term status",
            statusChangeDescription:
                "Change {name}'s status from {currentStatus} to {newStatus}?",
            statusChangeError:
                "The term status could not be changed.",

            term: "Term",
            dates: "Dates",
            changeStatus: "Change status",

            termCode: "Term code",
            termName: "Term name",
            startDate: "Start date",
            endDate: "End date",

            createSuccess:
                "The term was created successfully.",
            updateSuccess:
                "The term was updated successfully.",
        },

        curricula: {
            title: "Curricula",
            description:
                "Define curriculum units, learning outcomes, and instructional structure.",
            create: "Create curriculum",
            edit: "Edit curriculum",
            empty: "No curricula were found.",
            loading: "Loading curricula...",
            units: "Curriculum units",
            createUnit: "Create unit",
            editUnit: "Edit unit",
            learningOutcomes: "Learning outcomes",
            createOutcome: "Create learning outcome",
            addOutcome: "Add outcome",
            estimatedSessions: "Estimated sessions",
            parentUnit: "Parent unit",
            noParentUnit: "No parent unit",
            activateWarning:
                "After activation, curriculum structure becomes read-only.",
            backToList: "Back to curricula",
            activate: "Activate curriculum",
            activating: "Activating...",
            activateConfirmTitle: "Activate curriculum",
            activateConfirmDescription:
                "After activation, the curriculum structure can no longer be edited.",
            readOnlyMessage:
                "This curriculum is {status}. Its units and learning outcomes are read-only.",

            unitsDescription:
                "Define the ordered instructional structure.",
            loadingUnits: "Loading curriculum units...",
            unitsLoadError:
                "The curriculum units could not be loaded.",
            noUnits:
                "This curriculum does not contain any units yet.",

            outcomesFor: "Outcomes for {unit}",
            outcomeCount: "{count} outcomes",
            selectUnitPrompt:
                "Select a curriculum unit to view its outcomes.",
            selectUnitFromLeft:
                "Select a curriculum unit from the left panel.",
            loadingOutcomes:
                "Loading learning outcomes...",
            outcomesLoadError:
                "The learning outcomes could not be loaded.",
            noOutcomes:
                "This unit does not contain any learning outcomes yet.",

            unitSaveError:
                "The curriculum unit could not be saved.",
            outcomeSaveError:
                "The learning outcome could not be saved.",
            activationError:
                "The curriculum could not be activated.",
            loadError:
                "The curriculum could not be loaded.",
            searchPlaceholder: "Search curricula",
            includeArchived: "Include archived curricula",

            sessionLoading: "Loading user session...",
            sessionLoadError:
                "Your session could not be loaded.",

            saveError:
                "The curriculum could not be saved.",

            statusChangeTitle:
                "Change curriculum status",

            statusChangeDescription:
                "Change {name}'s status from {currentStatus} to {newStatus}?",

            statusChangeError:
                "The curriculum status could not be changed.",

            changeStatus: "Change status",

            curriculumName: "Curriculum",
            curriculumCode: "Curriculum code",
        },

        groups: {
            title: "Groups",
            description:
                "Manage teams, classes, and activity groups.",

            create: "Create group",
            edit: "Edit group",

            empty: "No groups were found.",
            loading: "Loading groups...",
            loadError: "Groups could not be loaded.",

            sessionLoading: "Loading user session...",
            sessionLoadError:
                "Your session could not be loaded.",

            searchPlaceholder: "Search groups",
            includeArchived: "Include archived groups",

            saveError: "The group could not be saved.",

            statusChangeTitle: "Change group status",
            statusChangeDescription:
                "Change {name}'s status from {currentStatus} to {newStatus}?",
            statusChangeError:
                "The group status could not be changed.",
            changeStatus: "Change status",

            group: "Group",
            program: "Program",
            term: "Term",
            branch: "Branch",
            capacity: "Capacity",
            ageRange: "Age range",

            groupCode: "Group code",
            groupName: "Group name",
            minimumAge: "Minimum age",
            maximumAge: "Maximum age",

            noBranch: "No branch",
            noAgeRestriction: "No age restriction",

            groupInformation: "Group information",

            enrollments: "Student enrollments",
            enrollStudent: "Enroll student",
            availablePlaces: "Available places",
            activeStudents: "Active students",
            includeEnrollmentHistory:
                "Include enrollment history",
            endEnrollment: "End enrollment",

            instructorAssignments:
                "Instructor assignments",
            assignInstructor: "Assign instructor",
            includeAssignmentHistory:
                "Include assignment history",
            endAssignment: "End assignment",

            groupCurriculum: "Group curriculum",
            assignCurriculum: "Assign curriculum",
            replaceCurriculum: "Replace curriculum",
            curriculumProgress: "Curriculum progress",
            completedSessions: "Completed sessions",

            createSuccess:
                "The group was created successfully.",
            updateSuccess:
                "The group was updated successfully.",
        },

        schedule: {
            title: "Schedule",
            description:
                "Manage lessons and training sessions.",
            mySchedule: "My schedule",
            createSession: "Create manual session",
            empty: "No sessions were found.",
            loading: "Loading schedule...",
            manageSchedule: "Manage schedule",
            scheduleRules: "Schedule rules",
            createRule: "Create schedule rule",
            editRule: "Edit schedule rule",
            generateSessions: "Generate sessions",
            generatedSession: "Generated session",
            weeklyTime: "Weekly time",
            effectivePeriod: "Effective period",
            curriculumUnit: "Curriculum unit",
            leadInstructor: "Lead instructor",
            noInstructor: "No lead instructor",
            noCurriculumUnit: "No curriculum-unit link",
            reschedule: "Reschedule",
            updateStatus: "Update session status",
            completionNotes: "Completion notes",
            cancellationReason: "Cancellation reason",
        },

        attendance: {
            title: "Session attendance",
            description:
                "Record and finalize session attendance.",
            initializeRoster: "Initialize roster",
            attendanceRoster: "Attendance roster",
            markAllPresent: "Mark all present",
            saveAttendance: "Save attendance",
            finalize: "Finalize attendance",
            refinalize: "Re-finalize attendance",
            correctionOpen:
                "Attendance correction is open.",
            openCorrection: "Open correction",
            correctionReason: "Correction reason",
            correctionHistory: "Correction history",
            noCorrections:
                "No attendance corrections have been recorded.",
            arrival: "Arrival",
            departure: "Departure",
            recorded: "Recorded",
            unrecorded: "Unrecorded",
            finalizedMessage:
                "Attendance has been finalized.",
        },

        evaluationTemplates: {
            title: "Evaluation Models",
            description:
                "Configure program-specific scoring models and weighted criteria.",
            create: "Create template",
            edit: "Edit evaluation template",
            empty: "No evaluation templates were found.",
            loading: "Loading evaluation templates...",
            scoringRange: "Scoring range",
            weightedCriteria: "Weighted criteria",
            createCriterion: "Create criterion",
            editCriterion: "Edit criterion",
            totalWeight: "Total weight",
            remainingWeight: "Remaining weight",
            activateWarning:
                "After activation, criteria and scoring range become read-only.",
            templateCode: "Template code",
            templateName: "Template name"
        },

        evaluations: {
            title: "Student evaluations",
            description:
                "Score student performance, submit evaluations, and publish results.",
            create: "Create evaluation",
            empty: "No evaluations were found.",
            loading: "Loading evaluations...",
            evaluationContext: "Evaluation context",
            evaluator: "Evaluator",
            evaluationDate: "Evaluation date",
            template: "Evaluation template",
            optionalSession: "Session (optional)",
            noSession: "No session context",
            criterionScores: "Criterion scores",
            criterionComment: "Criterion comment",
            overallComment: "Overall evaluator comment",
            weightedScore: "Weighted score",
            incomplete: "Incomplete",
            saveDraft: "Save draft",
            submitEvaluation: "Submit evaluation",
            publishEvaluation: "Publish evaluation",
            publishedEvaluations: "Published evaluations",
            scoreTrend: "Score trend",
            criterionAverages: "Criterion averages",
            developmentReport: "Development report",
            developmentStatus: "Development status",
            averageScore: "Average score",
            latestScore: "Latest score",
            passingRate: "Passing rate",
        },

        media: {
            title: "Media library",
            description:
                "Manage private photos, videos, and documents.",
            upload: "Upload media",
            empty: "No media files were found.",
            loading: "Loading media...",
            mediaType: "Media type",
            uploadStatus: "Upload status",
            file: "File",
            purpose: "Purpose",
            internalPortal: "Internal portal",
            marketing: "Marketing",
            caption: "Gallery caption",
            coverMedia: "Use as cover media",
            uploadProgress: "Upload progress",
            previewUnavailable: "Preview unavailable",
            openDocument: "Open document",
            editLink: "Edit media link",
        },

        reports: {
            title: "Reports",
            description:
                "View and download progress reports.",
            empty: "No reports were found.",
            loading: "Loading reports...",
            consolidatedProgress:
                "Consolidated progress report",
            generatePdf: "Generate PDF",
            pdfReports: "PDF progress reports",
            exportHistory: "Report export history",
            requested: "Requested",
            period: "Period",
            fileSize: "File size",
            attendedLessons: "Attended lessons",
            missedLessons: "Missed lessons",
            completedLessons: "Completed lessons",
            curriculumCompletion: "Curriculum completion",
        },

        settings: {
            title: "Organization settings",
            description:
                "Configure organization information and terminology.",
            generalInformation: "General information",
            organizationName: "Organization name",
            defaultLanguage: "Default language",
            terminology: "Configurable terminology",
            terminologyDescription:
                "Customize how common platform concepts appear to users.",
            studentLabel: "Student label",
            staffLabel: "Staff label",
            groupLabel: "Group label",
            sessionLabel: "Session label",
            programLabel: "Program label",
            save: "Save settings",
            saved:
                "Organization settings were updated.",
        },

        myChildren: {
            title: "My Children",
            description:
                "View attendance, development, evaluations, reports, and media for linked students.",
            empty:
                "No students are linked to this guardian account.",
            loading: "Loading linked students...",
            attendanceReport: "Attendance report",
            developmentReport: "Development report",
            studentMedia: "Student media",
        },

        evaluationTemplateDetail: {
            "backToTemplates": "Back to templates",
            "program": "Program",
            "version": "Version",
            "criteria": "Criteria",
            "descriptionTitle": "Description",
            "criteriaDescription": "Criteria must total exactly 100% before activation.",
            "remainingWeight": "Remaining weight",
            "sequence": "Sequence",
            "criterion": "Criterion",
            "total": "Total",
            "notDefined": "Not defined",

            "loadingCriteria": "Loading evaluation criteria...",
            "criteriaLoadError": "Evaluation criteria could not be loaded.",
            "noCriteria": "No evaluation criteria have been defined.",
            "loadError": "The evaluation template could not be loaded.",
            "saveCriterionError": "The evaluation criterion could not be saved.",
            "activationError": "The evaluation template could not be activated.",

            "readOnlyMessage": "This template is {status} and is read-only.",

            "activate": "Activate template",
            "activating": "Activating...",
            "activateConfirmation": "Activate this evaluation template? Its criteria and scoring range will become read-only."
        },

        sessionDetail: {
            "loading": "Loading attendance...",
            "permissionDenied": "You do not have permission to view attendance.",
            "loadError": "Attendance could not be loaded.",

            "backToSchedule": "Back to schedule",
            "pageTitle": "Session attendance",
            "sessionMedia": "Session media",

            "openCorrection": "Open correction",
            "initializing": "Initializing...",
            "initializeRoster": "Initialize roster",

            "attendanceFinalized": "Attendance was finalized on {date}.",
            "unknownDate": "an unknown date",

            "correctionOpen": "Attendance correction is open.",
            "reason": "Reason",

            "students": "Students",
            "recorded": "Recorded",
            "present": "Present",
            "late": "Late",
            "absent": "Absent",
            "excused": "Excused",

            "attendanceRoster": "Attendance roster",
            "unrecordedRemaining": "{count} records remain unrecorded.",

            "markAllPresent": "Mark all present",
            "saving": "Saving...",
            "saveAttendance": "Save attendance",
            "finalizing": "Finalizing...",
            "finalize": "Finalize",
            "refinalize": "Re-finalize",

            "student": "Student",
            "status": "Status",
            "arrival": "Arrival",
            "departure": "Departure",
            "note": "Note",

            "arrivalRequired": "Arrival time is required for every late student.",

            "correctionHistory": "Correction history",
            "correctionHistoryDescription": "Immutable before-and-after attendance changes.",
            "loadingCorrectionHistory": "Loading correction history...",

            "initializeError": "Attendance could not be initialized.",
            "saveError": "Attendance could not be saved.",
            "finalizeError": "Attendance could not be finalized.",
            "openCorrectionError": "Attendance correction could not be opened.",

            "finalizeConfirmation": "Finalize attendance? Normal editing will be locked.",
            "refinalizeConfirmation": "Re-finalize corrected attendance?"
        }
    },
} as const;

export const trTR = {
    common: {
        appName: "Akademi Platformu",

        actions: {
            add: "Ekle",
            create: "Oluştur",
            edit: "Düzenle",
            update: "Güncelle",
            updating: "Güncelleniyor...",
            save: "Kaydet",
            saveChanges: "Değişiklikleri kaydet",
            saving: "Kaydediliyor...",
            delete: "Sil",
            remove: "Kaldır",
            cancel: "İptal",
            close: "Kapat",
            confirm: "Onayla",
            view: "Görüntüle",
            viewSchedule: "Takvimi görüntüle",
            details: "Detaylar",
            search: "Ara",
            clear: "Temizle",
            filter: "Filtrele",
            reset: "Sıfırla",
            refresh: "Yenile",
            download: "İndir",
            upload: "Yükle",
            uploading: "Yükleniyor...",
            submit: "Gönder",
            submitting: "Gönderiliyor...",
            publish: "Yayınla",
            publishing: "Yayınlanıyor...",
            activate: "Aktifleştir",
            deactivate: "Pasifleştir",
            archive: "Arşivle",
            restore: "Geri yükle",
            regenerate: "Yeniden oluştur",
            assign: "Ata",
            link: "Bağla",
            unlink: "Bağlantıyı kaldır",
            finalize: "Kesinleştir",
            initialize: "Başlat",
            start: "Başlat",
            complete: "Tamamla",
            postpone: "Ertele",
            suspend: "Askıya al",
            reactivate: "Yeniden aktifleştir",
            invite: "Davet et",
            copy: "Kopyala",
            copied: "Kopyalandı",
            open: "Aç",
            back: "Geri",
            next: "Sonraki",
            previous: "Önceki",
            signIn: "Giriş yap",
            signOut: "Çıkış yap",
            joined: "Katıldı"
        },

        fields: {
            name: "Ad",
            firstName: "Ad",
            lastName: "Soyad",
            fullName: "Ad soyad",
            code: "Kod",
            number: "Numara",
            title: "Başlık",
            description: "Açıklama",
            status: "Durum",
            actions: "İşlemler",
            email: "E-posta",
            password: "Şifre",
            temporaryPassword: "Geçici şifre",
            phone: "Telefon",
            alternatePhone: "Alternatif telefon",
            address: "Adres",
            addressLine1: "Adres satırı 1",
            addressLine2: "Adres satırı 2",
            city: "Şehir",
            stateProvince: "İl veya bölge",
            postalCode: "Posta kodu",
            country: "Ülke",
            countryCode: "Ülke kodu",
            timezone: "Saat dilimi",
            locale: "Dil",
            startDate: "Başlangıç tarihi",
            endDate: "Bitiş tarihi",
            dateFrom: "Başlangıç",
            dateTo: "Bitiş",
            startTime: "Başlangıç saati",
            endTime: "Bitiş saati",
            date: "Tarih",
            time: "Saat",
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
            curriculum: "Müfredat",
            evaluation: "Değerlendirme",
            attendance: "Yoklama",
            location: "Konum",
            role: "Rol",
            roles: "Roller",
            permission: "Yetki",
            permissions: "Yetkiler",
            capacity: "Kapasite",
            ageRange: "Yaş aralığı",
            minimumAge: "Minimum yaş",
            maximumAge: "Maksimum yaş",
            notes: "Notlar",
            comment: "Yorum",
            reason: "Sebep",
            sequence: "Sıra",
            weight: "Ağırlık",
            score: "Puan",
            overallScore: "Genel puan",
            passingScore: "Geçme puanı",
            minimumScore: "Minimum puan",
            maximumScore: "Maksimum puan",
            progress: "İlerleme",
            percentage: "Yüzde",
            createdAt: "Oluşturulma tarihi",
            updatedAt: "Güncellenme tarihi",
            completedAt: "Tamamlanma tarihi",
            expiresAt: "Son geçerlilik tarihi",
            instructor: "Eğitmen",
            images: "Fotoğraflar",
            videos: "Videolar",
            documents: "Dökümanlar",
            image: "Fotoğraf",
            video: "Video",
            document: "Döküman",
        },

        statuses: {
            ACTIVE: "Aktif",
            INACTIVE: "Pasif",
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
            PRIMARY_INSTRUCTOR: "Ana eğitmen",
            ASSISTANT_INSTRUCTOR: "Yardımcı eğitmen",
            NEEDS_SUPPORT: "Desteğe ihtiyacı var",
            DEVELOPING: "Gelişiyor",
            ON_TRACK: "Hedef doğrultusunda",
            EXCEEDING_EXPECTATIONS:
                "Beklentilerin üzerinde",
            NO_DATA: "Veri yok",
            UNSPECIFIED: "Belirtilmemiş",
            FEMALE: "Kadın",
            MALE: "Erkek"
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
                "Oturumunuz sona erdi. Lütfen yeniden giriş yapın.",
            requiredFields:
                "Lütfen zorunlu alanları doldurun.",
            unexpectedError:
                "Beklenmeyen bir hata oluştu.",
            noPermission:
                "Bu işlemi gerçekleştirme yetkiniz yok.",
            changesSaved:
                "Değişiklikler başarıyla kaydedildi.",
        },

        filters: {
            all: "Tümü",
            includeArchived: "Arşivlenenleri göster",
            allStatuses: "Tüm durumlar",
            allPrograms: "Tüm programlar",
            allGroups: "Tüm gruplar",
            allTerms: "Tüm dönemler",
            allBranches: "Tüm şubeler",
            allTypes: "Tüm türler",
            searchPlaceholder: "Ara...",
        },

        pagination: {
            page: "Sayfa",
            of: "/",
            total: "Toplam",
            records: "kayıt",
        },

        dialogs: {
            confirmTitle: "İşlemi onayla",

            deleteTitle: "Kaydı sil",
            deleteDescription:
                "Bu işlem kaydı kalıcı olarak silebilir.",

            archiveTitle: "Kaydı arşivle",
            archiveDescription:
                "Kayıt artık aktif listelerde görüntülenmeyecektir.",

            unlinkTitle: "Bağlantıyı kaldır",
            unlinkDescription:
                "Bağlantı kaldırılacak ancak asıl kayıtlar korunacaktır.",

            publishTitle: "Değerlendirmeyi yayınla",
            publishDescription:
                "Değerlendirme öğrenci ve veli raporlarında görüntülenecektir.",

            finalizeAttendanceTitle: "Yoklamayı kesinleştir",
            finalizeAttendanceDescription:
                "Kesinleştirme sonrasında normal yoklama düzenleme işlemi kilitlenecektir.",

            suspendTitle: "Hesabı askıya al",
            suspendDescription:
                "Kullanıcı, hesabı yeniden aktifleştirilene kadar sisteme erişemeyecektir.",

            cancelTitle: "İşlemi iptal et",
            regenerateTitle: "Raporu yeniden oluştur",
            regenerateDescription:
                "Yeni bir rapor çıktısı oluşturulacaktır.",
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
        evaluationModels: "Değerlendirme Modelleri",
        evaluations: "Değerlendirmeler",
        media: "Medya",
        reports: "Raporlar",
        settings: "Ayarlar",
        menu: "Menü",
    },

    pages: {
        login: {
            title: "Giriş yap",
            description: "Kurum hesabınıza giriş yapın.",
            organization: "Kurum",
            forgotPassword: "Şifrenizi mi unuttunuz?",
            signingIn: "Giriş yapılıyor...",
            invalidCredentials:
                "Kurum, e-posta veya şifre hatalı.",
        },

        dashboard: {
            administratorTitle: "Yönetici paneli",
            instructorTitle: "Eğitmen paneli",
            welcome: "Hoş geldiniz",
            activeStudents: "Aktif öğrenciler",
            activeGroups: "Aktif gruplar",
            loading: "Analitik panel yükleniyor...",
            loadFailiure: "Analitik panel yüklenemedi.",
            activeStaff: "Aktif personel",
            activeCurricula: "Aktif müfredatlar",
            upcomingSessions: "Yaklaşan dersler",
            upcomingSessionsDescription: "Bir sonraki planlanmış dersler veya eğitim oturumları.",
            missingAttendance: "Eksik yoklamalar",
            draftEvaluations: "Taslak değerlendirmeler",
            pendingPublication: "Yayın bekleyenler",
            publishedEvaluations: "Yayınlanan değerlendirmeler",
            noUpcomingSessions:
                "Yaklaşan ders bulunamadı.",
        },

        users: {
            title: "Kurum kullanıcıları",
            description:
                "Yönetici, eğitmen, antrenör, öğretmen ve veli hesaplarını yönetin.",

            create: "Aktif kullanıcı oluştur",
            invite: "Kullanıcı davet et",

            searchPlaceholder: "Ad veya e-posta ile ara",

            empty: "Kullanıcı bulunamadı.",
            loading: "Kullanıcılar yükleniyor...",
            loadError: "Kullanıcılar yüklenemedi.",

            sessionLoading: "Kullanıcı oturumu yükleniyor...",
            sessionLoadError:
                "Kullanıcı oturumu yüklenemedi.",

            saveError: "Kullanıcı kaydedilemedi.",

            suspendTitle: "Kullanıcıyı askıya al",
            suspendDescription:
                "{name} adlı kullanıcı askıya alınsın mı? Kullanıcının aktif oturumu sonlandırılacak ve hesabı yeniden aktifleştirilene kadar sisteme erişemeyecektir.",
            suspendError:
                "Kullanıcı askıya alınamadı.",

            reactivateTitle: "Kullanıcıyı yeniden aktifleştir",
            reactivateDescription:
                "{name} adlı kullanıcı yeniden aktifleştirilsin mi? Kullanıcı tekrar giriş yapabilecektir.",
            reactivateError:
                "Kullanıcı yeniden aktifleştirilemedi.",

            totalUsers: "{count} kullanıcı",
            pageInformation:
                "Sayfa {page} / {totalPages}",

            editTitle: "Kurum kullanıcısını düzenle",
            invitationCreated: "Davet oluşturuldu",
            invitationUrl: "Davet bağlantısı",
            invitationExpires:
                "Davetin geçerlilik süresi {date} tarihinde sona erecektir.",
            invitationSecurityWarning:
                "Bu bağlantı bir güvenlik anahtarı içerir. Bağlantıyı herkese açık olarak paylaşmayın veya uygulama günlüklerine kaydetmeyin.",

            user: "Kullanıcı",
            roles: "Roller",
            lastLogin: "Son giriş",
            neverLoggedIn: "Hiç giriş yapmadı",

            createActiveUser: "Aktif kullanıcı oluştur",
            inviteUser: "Kullanıcı davet et",
            editUser: "Kullanıcıyı düzenle",

            organizationAccount: "Kurum hesabı",
            temporaryPassword: "Geçici şifre",
            selectRole: "En az bir rol seçin.",
        },

        branches: {
            title: "Şubeler",
            description:
                "Kampüs, ofis ve antrenman merkezlerini yönetin.",
            create: "Şube oluştur",
            edit: "Şubeyi düzenle",
            empty: "Şube bulunamadı.",
            notAssigned: "Şube ataması yok",
            loading: "Şubeler yükleniyor...",
            includeArchived: "Arşivlenen şubeleri göster",
            contact: "İletişim",
            code: "Şube kodu",
            name: "Şube adı",
            save: "Şubeyi kaydet",
        },

        staff: {
            title: "Personel",
            description:
                "Eğitmen, antrenör, öğretmen ve diğer kurum personellerini yönetin.",

            create: "Personel profili oluştur",
            edit: "Personel profilini düzenle",

            empty: "Personel profili bulunamadı.",
            loading: "Personeller yükleniyor...",
            loadError:
                "Personel profilleri yüklenemedi.",

            sessionLoading:
                "Kullanıcı oturumu yükleniyor...",
            sessionLoadError:
                "Kullanıcı oturumu yüklenemedi.",

            searchPlaceholder: "Personel ara",
            includeArchived:
                "Arşivlenen personelleri göster",

            saveError:
                "Personel profili kaydedilemedi.",

            statusChangeTitle:
                "Çalışma durumunu değiştir",
            statusChangeDescription:
                "{name} adlı personelin çalışma durumu {currentStatus} iken {newStatus} olarak değiştirilsin mi?",
            statusChangeError:
                "Personelin çalışma durumu değiştirilemedi.",

            staff: "Personel",
            staffNumber: "Personel numarası",
            specialization: "Uzmanlık",
            employmentStatus: "Çalışma durumu",
            branch: "Şube",
            instructorAccount: "Eğitmen hesabı",
            selectInstructorAccount:
                "Eğitmen hesabı seçin",
            noEligibleAccount:
                "Uygun eğitmen hesabı bulunamadı. Önce Kullanıcılar sayfasından bir eğitmen hesabı oluşturun veya davet edin.",

            titleField: "Unvan",
            hireDate: "İşe giriş tarihi",
            employmentEndDate:
                "İşten ayrılma tarihi",
            biography: "Biyografi",

            noBranchAssignment: "Şube ataması yok",
            titlePlaceholder: "Kıdemli Antrenör",
            specializationPlaceholder:
                "Futbol, İngilizce, Piyano",

            createSuccess:
                "Personel profili başarıyla oluşturuldu.",
            updateSuccess:
                "Personel profili başarıyla güncellendi.",
        },

        guardians: {
            title: "Veliler",
            description:
                "Veli ve yasal vasi profillerini yönetin.",

            create: "Veli profili oluştur",
            edit: "Veli profilini düzenle",

            empty: "Veli profili bulunamadı.",
            loading: "Veliler yükleniyor...",
            loadError:
                "Veli profilleri yüklenemedi.",

            sessionLoading:
                "Kullanıcı oturumu yükleniyor...",
            sessionLoadError:
                "Kullanıcı oturumu yüklenemedi.",

            searchPlaceholder: "Veli ara",
            includeArchived:
                "Arşivlenen velileri göster",

            saveError:
                "Veli profili kaydedilemedi.",

            statusChangeError:
                "Veli durumu değiştirilemedi.",

            statusChangeTitle:
                "Veli durumunu değiştir",

            statusChangeDescription:
                "{name} adlı velinin durumu {currentStatus} iken {newStatus} olarak değiştirilsin mi?",

            guardian: "Veli",
            guardianNumber: "Veli numarası",
            number: "Numara",
            contact: "İletişim",
            location: "Konum",
            occupation: "Meslek",
            alternatePhone: "Alternatif telefon",

            noEligibleAccount:
                "Uygun veli hesabı bulunamadı. Önce Kullanıcılar sayfasından bir veli hesabı oluşturun veya davet edin.",

            guardianAccount: "Veli hesabı",
            selectGuardianAccount:
                "Veli hesabı seçin",

            notes: "Notlar",
        },

        students: {
            title: "Öğrenciler",
            description:
                "Öğrenci kayıtlarını, acil durum bilgilerini ve veli ilişkilerini yönetin.",
            create: "Öğrenci oluştur",
            edit: "Öğrenciyi düzenle",
            empty: "Öğrenci bulunamadı.",
            loading: "Öğrenciler yükleniyor...",
            searchPlaceholder:
                "Ad veya öğrenci numarası ile ara",
            studentNumber: "Öğrenci numarası",
            birthDate: "Doğum tarihi",
            gender: "Cinsiyet",
            enrollmentDate: "Kayıt tarihi",
            emergencyInformation: "Acil durum bilgileri",
            emergencyContact: "Acil durum kişisi",
            emergencyPhone: "Acil durum telefonu",
            medicalInformation: "Sağlık bilgileri",
            allergies: "Alerjiler",
            medicalNotes: "Sağlık notları",
            generalNotes: "Genel notlar",
            guardianCount: "Veliler",
            linkGuardian: "Veli bağla",
            relationship: "Yakınlık",
            primaryContact: "Birincil iletişim kişisi",
            legalGuardian: "Yasal vasi",
            pickupAuthorized: "Teslim alma yetkisi",
            receivesNotifications: "Bildirim alır",
            internalMediaConsent: "Kurum içi medya izni",
            marketingMediaConsent: "Pazarlama medya izni",
        },

        programs: {
            title: "Programlar",
            description:
                "Spor, ders, bölüm ve etkinlik programlarını yönetin.",

            create: "Program oluştur",
            edit: "Programı düzenle",
            select: "Program seç",

            empty: "Program bulunamadı.",
            loading: "Programlar yükleniyor...",
            loadError: "Programlar yüklenemedi.",

            sessionLoading:
                "Kullanıcı oturumu yükleniyor...",
            sessionLoadError:
                "Kullanıcı oturumu yüklenemedi.",

            searchPlaceholder: "Program ara",
            includeArchived:
                "Arşivlenen programları göster",

            saveError: "Program kaydedilemedi.",

            statusChangeTitle:
                "Program durumunu değiştir",
            statusChangeDescription:
                "{name} programının durumu {currentStatus} iken {newStatus} olarak değiştirilsin mi?",
            statusChangeError:
                "Program durumu değiştirilemedi.",

            program: "Program",
            category: "Kategori",
            ageRange: "Yaş aralığı",
            noAgeRestriction: "Yaş sınırı yok",

            programCode: "Program kodu",
            programName: "Program adı",
            minimumAge: "Minimum yaş",
            maximumAge: "Maksimum yaş",

            categoryPlaceholder:
                "SPOR, DİL, MÜZİK",

            createSuccess:
                "Program başarıyla oluşturuldu.",
            updateSuccess:
                "Program başarıyla güncellendi.",
        },

        terms: {
            title: "Dönemler",
            description:
                "Akademik yıl, sömestr ve etkinlik dönemlerini yönetin.",

            create: "Dönem oluştur",
            edit: "Dönemi düzenle",

            empty: "Dönem bulunamadı.",
            loading: "Dönemler yükleniyor...",
            loadError: "Dönemler yüklenemedi.",

            sessionLoading:
                "Kullanıcı oturumu yükleniyor...",
            sessionLoadError:
                "Kullanıcı oturumu yüklenemedi.",

            searchPlaceholder: "Dönem ara",
            includeArchived:
                "Arşivlenen dönemleri göster",

            saveError: "Dönem kaydedilemedi.",

            statusChangeTitle:
                "Dönem durumunu değiştir",
            statusChangeDescription:
                "{name} döneminin durumu {currentStatus} iken {newStatus} olarak değiştirilsin mi?",
            statusChangeError:
                "Dönem durumu değiştirilemedi.",

            term: "Dönem",
            dates: "Tarihler",
            changeStatus: "Durumu değiştir",

            termCode: "Dönem kodu",
            termName: "Dönem adı",
            startDate: "Başlangıç tarihi",
            endDate: "Bitiş tarihi",

            createSuccess:
                "Dönem başarıyla oluşturuldu.",
            updateSuccess:
                "Dönem başarıyla güncellendi.",
        },

        curricula: {
            title: "Müfredatlar",
            description:
                "Müfredat ünitelerini, öğrenim çıktılarını ve eğitim yapısını yönetin.",
            create: "Müfredat oluştur",
            edit: "Müfredatı düzenle",
            empty: "Müfredat bulunamadı.",
            loading: "Müfredatlar yükleniyor...",
            units: "Müfredat üniteleri",
            createUnit: "Ünite oluştur",
            editUnit: "Üniteyi düzenle",
            learningOutcomes: "Öğrenim çıktıları",
            createOutcome: "Öğrenim çıktısı oluştur",
            addOutcome: "Çıktı ekle",
            estimatedSessions: "Tahmini ders sayısı",
            parentUnit: "Üst ünite",
            noParentUnit: "Üst ünite yok",
            activateWarning:
                "Aktifleştirme sonrasında müfredat yapısı salt okunur olacaktır.",
            backToList: "Müfredatlara dön",
            activate: "Müfredatı aktifleştir",
            activating: "Aktifleştiriliyor...",
            activateConfirmTitle: "Müfredatı aktifleştir",
            activateConfirmDescription:
                "Aktifleştirme sonrasında müfredat yapısı artık düzenlenemez.",
            readOnlyMessage:
                "Bu müfredatın durumu {status}. Üniteler ve öğrenim çıktıları salt okunur durumdadır.",

            unitsDescription:
                "Sıralı eğitim yapısını tanımlayın.",
            loadingUnits:
                "Müfredat üniteleri yükleniyor...",
            unitsLoadError:
                "Müfredat üniteleri yüklenemedi.",
            noUnits:
                "Bu müfredatta henüz bir ünite bulunmuyor.",

            outcomesFor: "{unit} ünitesinin öğrenim çıktıları",
            outcomeCount: "{count} öğrenim çıktısı",
            selectUnitPrompt:
                "Öğrenim çıktılarını görüntülemek için bir müfredat ünitesi seçin.",
            selectUnitFromLeft:
                "Sol panelden bir müfredat ünitesi seçin.",
            loadingOutcomes:
                "Öğrenim çıktıları yükleniyor...",
            outcomesLoadError:
                "Öğrenim çıktıları yüklenemedi.",
            noOutcomes:
                "Bu ünitede henüz bir öğrenim çıktısı bulunmuyor.",

            unitSaveError:
                "Müfredat ünitesi kaydedilemedi.",
            outcomeSaveError:
                "Öğrenim çıktısı kaydedilemedi.",
            activationError:
                "Müfredat aktifleştirilemedi.",
            loadError:
                "Müfredat yüklenemedi.",

            searchPlaceholder: "Müfredat ara",
            includeArchived:
                "Arşivlenen müfredatları göster",

            sessionLoading:
                "Kullanıcı oturumu yükleniyor...",

            sessionLoadError:
                "Kullanıcı oturumu yüklenemedi.",

            saveError:
                "Müfredat kaydedilemedi.",

            statusChangeTitle:
                "Müfredat durumunu değiştir",

            statusChangeDescription:
                "{name} müfredatının durumu {currentStatus} iken {newStatus} olarak değiştirilsin mi?",

            statusChangeError:
                "Müfredat durumu değiştirilemedi.",

            changeStatus: "Durumu değiştir",

            curriculumName: "Müfredat",
            curriculumCode: "Müfredat kodu",
        },

        groups: {
            title: "Gruplar",
            description:
                "Takım, sınıf ve etkinlik gruplarını yönetin.",

            create: "Grup oluştur",
            edit: "Grubu düzenle",

            empty: "Grup bulunamadı.",
            loading: "Gruplar yükleniyor...",
            loadError: "Gruplar yüklenemedi.",

            sessionLoading:
                "Kullanıcı oturumu yükleniyor...",
            sessionLoadError:
                "Kullanıcı oturumu yüklenemedi.",

            searchPlaceholder: "Grup ara",
            includeArchived:
                "Arşivlenen grupları göster",

            saveError: "Grup kaydedilemedi.",

            statusChangeTitle:
                "Grup durumunu değiştir",
            statusChangeDescription:
                "{name} grubunun durumu {currentStatus} iken {newStatus} olarak değiştirilsin mi?",
            statusChangeError:
                "Grup durumu değiştirilemedi.",
            changeStatus: "Durumu değiştir",

            group: "Grup",
            program: "Program",
            term: "Dönem",
            branch: "Şube",
            capacity: "Kapasite",
            ageRange: "Yaş aralığı",

            groupCode: "Grup kodu",
            groupName: "Grup adı",
            minimumAge: "Minimum yaş",
            maximumAge: "Maksimum yaş",

            noBranch: "Şube yok",
            noAgeRestriction: "Yaş sınırı yok",

            groupInformation: "Grup bilgileri",

            enrollments: "Öğrenci kayıtları",
            enrollStudent: "Öğrenci kaydet",
            availablePlaces: "Boş kontenjan",
            activeStudents: "Aktif öğrenciler",
            includeEnrollmentHistory:
                "Kayıt geçmişini göster",
            endEnrollment: "Kaydı sonlandır",

            instructorAssignments:
                "Eğitmen atamaları",
            assignInstructor: "Eğitmen ata",
            includeAssignmentHistory:
                "Atama geçmişini göster",
            endAssignment: "Atamayı sonlandır",

            groupCurriculum: "Grup müfredatı",
            assignCurriculum: "Müfredat ata",
            replaceCurriculum: "Müfredatı değiştir",
            curriculumProgress: "Müfredat ilerlemesi",
            completedSessions: "Tamamlanan dersler",

            createSuccess:
                "Grup başarıyla oluşturuldu.",
            updateSuccess:
                "Grup başarıyla güncellendi.",
        },

        schedule: {
            title: "Takvim",
            description:
                "Ders ve antrenman oturumlarını yönetin.",
            mySchedule: "Takvimim",
            createSession: "Manuel ders oluştur",
            empty: "Ders bulunamadı.",
            loading: "Takvim yükleniyor...",
            manageSchedule: "Takvimi yönet",
            scheduleRules: "Takvim kuralları",
            createRule: "Takvim kuralı oluştur",
            editRule: "Takvim kuralını düzenle",
            generateSessions: "Dersleri oluştur",
            generatedSession: "Oluşturulan ders",
            weeklyTime: "Haftalık zaman",
            effectivePeriod: "Geçerlilik dönemi",
            curriculumUnit: "Müfredat ünitesi",
            leadInstructor: "Sorumlu eğitmen",
            noInstructor: "Sorumlu eğitmen yok",
            noCurriculumUnit: "Müfredat ünitesi bağlantısı yok",
            reschedule: "Yeniden planla",
            updateStatus: "Ders durumunu güncelle",
            completionNotes: "Tamamlama notları",
            cancellationReason: "İptal sebebi",
        },

        attendance: {
            title: "Ders yoklaması",
            description:
                "Ders yoklamasını kaydedin ve kesinleştirin.",
            initializeRoster: "Yoklama listesini oluştur",
            attendanceRoster: "Yoklama listesi",
            markAllPresent: "Tümünü katıldı işaretle",
            saveAttendance: "Yoklamayı kaydet",
            finalize: "Yoklamayı kesinleştir",
            refinalize: "Yeniden kesinleştir",
            correctionOpen: "Yoklama düzeltmesi açık.",
            openCorrection: "Düzeltme aç",
            correctionReason: "Düzeltme sebebi",
            correctionHistory: "Düzeltme geçmişi",
            noCorrections:
                "Yoklama düzeltmesi kaydedilmedi.",
            arrival: "Geliş",
            departure: "Ayrılış",
            recorded: "Kaydedilen",
            unrecorded: "Kaydedilmeyen",
            finalizedMessage: "Yoklama kesinleştirildi.",
        },

        evaluationTemplates: {
            title: "Değerlendirme Modelleri",
            description:
                "Programa özel puanlama modellerini ve ağırlıklı kriterleri yönetin.",
            create: "Model oluştur",
            edit: "Değerlendirme modelini düzenle",
            empty: "Değerlendirme modeli bulunamadı.",
            loading: "Değerlendirme modelleri yükleniyor...",
            scoringRange: "Puan aralığı",
            weightedCriteria: "Ağırlıklı kriterler",
            createCriterion: "Kriter oluştur",
            editCriterion: "Kriteri düzenle",
            totalWeight: "Toplam ağırlık",
            remainingWeight: "Kalan ağırlık",
            activateWarning:
                "Aktifleştirme sonrasında kriterler ve puan aralığı salt okunur olacaktır.",
            templateCode: "Değerlendirme modeli kodu",
            templateName: "Değerlendirme modeli ismi"
        },

        evaluations: {
            title: "Öğrenci değerlendirmeleri",
            description:
                "Öğrenci performansını puanlayın, değerlendirmeleri gönderin ve yayınlayın.",
            create: "Değerlendirme oluştur",
            empty: "Değerlendirme bulunamadı.",
            loading: "Değerlendirmeler yükleniyor...",
            evaluationContext: "Değerlendirme bağlamı",
            evaluator: "Değerlendiren",
            evaluationDate: "Değerlendirme tarihi",
            template: "Değerlendirme modeli",
            optionalSession: "Ders (isteğe bağlı)",
            noSession: "Ders bağlantısı yok",
            criterionScores: "Kriter puanları",
            criterionComment: "Kriter yorumu",
            overallComment: "Genel değerlendirici yorumu",
            weightedScore: "Ağırlıklı puan",
            incomplete: "Eksik",
            saveDraft: "Taslağı kaydet",
            submitEvaluation: "Değerlendirmeyi gönder",
            publishEvaluation: "Değerlendirmeyi yayınla",
            publishedEvaluations: "Yayınlanan değerlendirmeler",
            scoreTrend: "Puan değişimi",
            criterionAverages: "Kriter ortalamaları",
            developmentReport: "Gelişim raporu",
            developmentStatus: "Gelişim durumu",
            averageScore: "Ortalama puan",
            latestScore: "Son puan",
            passingRate: "Başarı oranı",
        },

        media: {
            title: "Medya kütüphanesi",
            description:
                "Özel fotoğraf, video ve belgeleri yönetin.",
            upload: "Medya yükle",
            empty: "Medya bulunamadı.",
            loading: "Medya yükleniyor...",
            mediaType: "Medya türü",
            uploadStatus: "Yükleme durumu",
            file: "Dosya",
            purpose: "Kullanım amacı",
            internalPortal: "Kurum içi portal",
            marketing: "Pazarlama",
            caption: "Galeri açıklaması",
            coverMedia: "Kapak medyası olarak kullan",
            uploadProgress: "Yükleme ilerlemesi",
            previewUnavailable: "Ön izleme kullanılamıyor",
            openDocument: "Belgeyi aç",
            editLink: "Medya bağlantısını düzenle",
        },

        reports: {
            title: "Raporlar",
            description:
                "Gelişim raporlarını görüntüleyin ve indirin.",
            empty: "Rapor bulunamadı.",
            loading: "Raporlar yükleniyor...",
            consolidatedProgress: "Birleşik gelişim raporu",
            generatePdf: "PDF oluştur",
            pdfReports: "PDF gelişim raporları",
            exportHistory: "Rapor çıktı geçmişi",
            requested: "Talep tarihi",
            period: "Dönem",
            fileSize: "Dosya boyutu",
            attendedLessons: "Katıldığı dersler",
            missedLessons: "Kaçırdığı dersler",
            completedLessons: "Tamamlanan dersler",
            curriculumCompletion: "Müfredat tamamlanma oranı",
        },

        settings: {
            title: "Kurum ayarları",
            description:
                "Kurum bilgilerini ve terminolojiyi yönetin.",
            generalInformation: "Genel bilgiler",
            organizationName: "Kurum adı",
            defaultLanguage: "Varsayılan dil",
            terminology: "Özelleştirilebilir terminoloji",
            terminologyDescription:
                "Platformdaki temel kavramların kullanıcılara nasıl gösterileceğini özelleştirin.",
            studentLabel: "Öğrenci etiketi",
            staffLabel: "Personel etiketi",
            groupLabel: "Grup etiketi",
            sessionLabel: "Ders etiketi",
            programLabel: "Program etiketi",
            save: "Ayarları kaydet",
            saved: "Kurum ayarları güncellendi.",
        },

        myChildren: {
            title: "Çocuklarım",
            description:
                "Bağlı öğrencilerin yoklama, gelişim, değerlendirme, rapor ve medya bilgilerini görüntüleyin.",
            empty: "Bu veli hesabına bağlı öğrenci bulunamadı.",
            loading: "Bağlı öğrenciler yükleniyor...",
            attendanceReport: "Yoklama raporu",
            developmentReport: "Gelişim raporu",
            studentMedia: "Öğrenci medyası",
        },

        evaluationTemplateDetail: {
            "backToTemplates": "Şablonlara dön",
            "program": "Program",
            "version": "Sürüm",
            "criteria": "Kriterler",
            "descriptionTitle": "Açıklama",
            "criteriaDescription": "Aktifleştirmeden önce kriterlerin toplam ağırlığı tam olarak %100 olmalıdır.",
            "remainingWeight": "Kalan ağırlık",
            "sequence": "Sıra",
            "criterion": "Kriter",
            "total": "Toplam",
            "notDefined": "Tanımlanmadı",

            "loadingCriteria": "Değerlendirme kriterleri yükleniyor...",
            "criteriaLoadError": "Değerlendirme kriterleri yüklenemedi.",
            "noCriteria": "Henüz herhangi bir değerlendirme kriteri tanımlanmadı.",
            "loadError": "Değerlendirme şablonu yüklenemedi.",
            "saveCriterionError": "Değerlendirme kriteri kaydedilemedi.",
            "activationError": "Değerlendirme şablonu aktifleştirilemedi.",

            "readOnlyMessage": "Bu şablonun durumu {status}. Salt okunur durumdadır.",

            "activate": "Şablonu aktifleştir",
            "activating": "Aktifleştiriliyor...",
            "activateConfirmation": "Bu değerlendirme şablonu aktifleştirilsin mi? Aktifleştirme sonrasında kriterler ve puan aralığı salt okunur olacaktır."
        },

        sessionDetail: {
            "loading": "Yoklama yükleniyor...",
            "permissionDenied": "Yoklamayı görüntüleme yetkiniz bulunmamaktadır.",
            "loadError": "Yoklama yüklenemedi.",

            "backToSchedule": "Takvime dön",
            "pageTitle": "Oturum yoklaması",
            "sessionMedia": "Oturum medyaları",

            "openCorrection": "Düzeltme aç",
            "initializing": "Hazırlanıyor...",
            "initializeRoster": "Yoklama listesini oluştur",

            "attendanceFinalized": "Yoklama {date} tarihinde kesinleştirildi.",
            "unknownDate": "bilinmeyen bir tarihte",

            "correctionOpen": "Yoklama düzeltmesi açıktır.",
            "reason": "Gerekçe",

            "students": "Öğrenciler",
            "recorded": "Kaydedilen",
            "present": "Katıldı",
            "late": "Geç",
            "absent": "Yok",
            "excused": "Mazeretli",

            "attendanceRoster": "Yoklama listesi",
            "unrecordedRemaining": "{count} kayıt henüz işaretlenmedi.",

            "markAllPresent": "Tümünü katıldı olarak işaretle",
            "saving": "Kaydediliyor...",
            "saveAttendance": "Yoklamayı kaydet",
            "finalizing": "Kesinleştiriliyor...",
            "finalize": "Kesinleştir",
            "refinalize": "Tekrar kesinleştir",

            "student": "Öğrenci",
            "status": "Durum",
            "arrival": "Geliş",
            "departure": "Çıkış",
            "note": "Not",

            "arrivalRequired": "Geç olarak işaretlenen her öğrenci için geliş saati zorunludur.",

            "correctionHistory": "Düzeltme geçmişi",
            "correctionHistoryDescription": "Yoklama değişikliklerinin değiştirilemez önce-sonra kayıtları.",
            "loadingCorrectionHistory": "Düzeltme geçmişi yükleniyor...",

            "initializeError": "Yoklama başlatılamadı.",
            "saveError": "Yoklama kaydedilemedi.",
            "finalizeError": "Yoklama kesinleştirilemedi.",
            "openCorrectionError": "Yoklama düzeltmesi açılamadı.",

            "finalizeConfirmation": "Yoklama kesinleştirilsin mi? Normal düzenleme kilitlenecektir.",
            "refinalizeConfirmation": "Düzeltilmiş yoklama tekrar kesinleştirilsin mi?"
        }
    },
} satisfies TranslationShape<typeof enUS>;

export const dictionaries = {
    "en-US": enUS,
    "tr-TR": trTR,
};

export type SupportedLocale =
    keyof typeof dictionaries;

export type TranslationDictionary =
    TranslationShape<typeof enUS>;