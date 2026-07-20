package com.academy.platform.attendance;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.academy.platform.authentication.AuthenticatedUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping(
        "/api/v1/sessions/{sessionId}/attendance"
)
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final AttendanceCorrectionService correctionService;

    public AttendanceController(
            AttendanceService attendanceService,
            AttendanceCorrectionService correctionService
    ) {
        this.attendanceService = attendanceService;
        this.correctionService = correctionService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('attendance.read')")
    public SessionAttendanceResponse findAttendance(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID sessionId
    ) {
        return attendanceService.findAttendance(
                currentUser,
                sessionId
        );
    }

    @PostMapping("/initialize")
    @PreAuthorize(
            "hasAuthority('attendance.record')"
    )
    public SessionAttendanceResponse initializeAttendance(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID sessionId
    ) {
        return attendanceService.initializeAttendance(
                currentUser,
                sessionId
        );
    }

    @PutMapping
    @PreAuthorize(
            "hasAuthority('attendance.record')"
    )
    public SessionAttendanceResponse saveAttendance(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID sessionId,
            @Valid
            @RequestBody SaveAttendanceRequest request
    ) {
        return attendanceService.saveAttendance(
                currentUser,
                sessionId,
                request
        );
    }

    @PostMapping("/finalize")
    @PreAuthorize(
            "hasAuthority('attendance.finalize')"
    )
    public SessionAttendanceResponse finalizeAttendance(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID sessionId
    ) {
        return attendanceService.finalizeAttendance(
                currentUser,
                sessionId
        );
    }

    @PostMapping("/corrections/open")
    @PreAuthorize(
            "hasAuthority('attendance.correct')"
    )
    public AttendanceCorrectionResponse openCorrection(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID sessionId,
            @Valid
            @RequestBody OpenAttendanceCorrectionRequest request
    ) {
        return correctionService.openCorrection(
                currentUser,
                sessionId,
                request.reason()
        );
    }

    @GetMapping("/corrections")
    @PreAuthorize(
            "hasAuthority('attendance.read')"
    )
    public List<AttendanceCorrectionResponse>
            findCorrectionHistory(
                    @AuthenticationPrincipal AuthenticatedUser currentUser,
                    @PathVariable UUID sessionId
            ) {
        return correctionService.findHistory(
                currentUser,
                sessionId
        );
    }

    @GetMapping("/corrections/{correctionId}")
    @PreAuthorize(
            "hasAuthority('attendance.read')"
    )
    public AttendanceCorrectionResponse findCorrection(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID sessionId,
            @PathVariable UUID correctionId
    ) {
        return correctionService.findCorrection(
                currentUser,
                sessionId,
                correctionId
        );
    }
}
