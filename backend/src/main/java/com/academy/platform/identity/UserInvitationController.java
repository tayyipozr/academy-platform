package com.academy.platform.identity;

import com.academy.platform.authentication.AuthenticatedUser;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class UserInvitationController {

    private final UserInvitationService invitationService;

    public UserInvitationController(
            UserInvitationService invitationService
    ) {
        this.invitationService = invitationService;
    }

    @PostMapping("/users/invitations")
    @PreAuthorize("hasAuthority('users.create')")
    public UserInvitationResponse createInvitation(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @Valid
            @RequestBody
            CreateUserInvitationRequest request
    ) {
        return invitationService.createInvitation(
                currentUser,
                request
        );
    }

    @PostMapping("/invitations/accept")
    public AcceptUserInvitationResponse acceptInvitation(
            @Valid
            @RequestBody
            AcceptUserInvitationRequest request
    ) {
        return invitationService.acceptInvitation(request);
    }
}
