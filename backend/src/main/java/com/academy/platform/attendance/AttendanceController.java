package com.academy.platform.attendance;

import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@RequestMapping(
        "/api/v1/sessions/{sessionId}/attendance"
)
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(
            AttendanceService attendanceService
    ) {
        this.attendanceService = attendanceService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('attendance.read')")
    public SessionAttendanceResponse findAttendance(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID sessionId
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
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID sessionId
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
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID sessionId,

            @Valid
            @RequestBody
            SaveAttendanceRequest request
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
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID sessionId
    ) {
        return attendanceService.finalizeAttendance(
                currentUser,
                sessionId
        );
    }
}
