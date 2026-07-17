package com.academy.platform.student;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/students")
public class StudentController {

    private final StudentService studentService;

    public StudentController(
            StudentService studentService
    ) {
        this.studentService = studentService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('students.read')")
    public List<StudentResponse> findStudents(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @RequestParam(defaultValue = "")
            String search,

            @RequestParam(defaultValue = "false")
            boolean includeArchived
    ) {
        return studentService.findStudents(
                currentUser.organizationId(),
                search,
                includeArchived
        );
    }

    @GetMapping("/{studentId}")
    @PreAuthorize("hasAuthority('students.read')")
    public StudentResponse findStudent(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID studentId
    ) {
        return studentService.findStudent(
                currentUser.organizationId(),
                studentId
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('students.manage')")
    public ResponseEntity<StudentResponse> createStudent(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @Valid
            @RequestBody
            SaveStudentRequest request
    ) {
        StudentResponse student =
                studentService.createStudent(
                        currentUser,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/students/"
                                        + student.id()
                        )
                )
                .body(student);
    }

    @PutMapping("/{studentId}")
    @PreAuthorize("hasAuthority('students.manage')")
    public StudentResponse updateStudent(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID studentId,

            @Valid
            @RequestBody
            SaveStudentRequest request
    ) {
        return studentService.updateStudent(
                currentUser,
                studentId,
                request
        );
    }

    @PostMapping("/{studentId}/status/{status}")
    @PreAuthorize("hasAuthority('students.manage')")
    public ResponseEntity<Void> updateStatus(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID studentId,

            @PathVariable
            StudentStatus status
    ) {
        studentService.updateStatus(
                currentUser,
                studentId,
                status
        );

        return ResponseEntity.noContent().build();
    }
}
