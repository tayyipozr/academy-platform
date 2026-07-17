package com.academy.platform.identity;

import java.util.List;

import com.academy.platform.authentication.AuthenticatedUser;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/accounts/assignable")
public class AssignableAccountController {

    private final AssignableAccountService accountService;

    public AssignableAccountController(
            AssignableAccountService accountService
    ) {
        this.accountService = accountService;
    }

    @GetMapping
    @PreAuthorize(
            "hasAnyAuthority('staff.manage', 'guardians.manage')"
    )
    public List<AssignableAccountResponse> findAccounts(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @RequestParam
            String role
    ) {
        return accountService.findAccounts(
                currentUser.organizationId(),
                role
        );
    }
}
