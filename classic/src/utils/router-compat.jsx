import React, { forwardRef } from 'react';
import { useLocation, useNavigate, useRouterState } from '@tanstack/react-router';

const absoluteUrlPattern = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

const isModifiedEvent = (event) => (
    event.metaKey || event.altKey || event.ctrlKey || event.shiftKey
);

const joinClassNames = (...classes) => classes.filter(Boolean).join(' ');

const isHashLink = (target) => !target || target === '#' || target.startsWith('#');

const isExternalLink = (target) => (
    absoluteUrlPattern.test(target) || target.startsWith('//')
);

const resolveTarget = (target, pathname) => {
    if (!target || target.startsWith('/') || isExternalLink(target) || isHashLink(target)) {
        return target || '#';
    }

    const base = `${window.location.origin}${pathname}`;
    const url = new URL(target, base);
    return `${url.pathname}${url.search}${url.hash}`;
};

export const isRouteActive = (pathname, path, exact = false) => {
    if (!path || isHashLink(path) || isExternalLink(path)) {
        return false;
    }

    const normalizedPath = (path.startsWith('/') ? path : `/${path}`).replace(/\/+$/, '') || '/';

    if (exact) {
        return pathname === normalizedPath;
    }

    return pathname === normalizedPath || pathname.startsWith(`${normalizedPath}/`);
};

export const useRouteMatch = (path, options = {}) => {
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    return isRouteActive(pathname, path, options.exact);
};

export const useHistory = () => {
    const navigate = useNavigate();
    return {
        push: (to) => navigate({ to }),
        replace: (to) => navigate({ to, replace: true }),
    };
};

export { useLocation };

export const Link = forwardRef(({
    to,
    href,
    children,
    className,
    activeClassName,
    exact,
    onClick,
    target,
    replace,
    ...rest
}, ref) => {
    const navigate = useNavigate();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const rawTarget = href ?? to ?? '#';
    const resolvedTarget = typeof rawTarget === 'string' ? resolveTarget(rawTarget, pathname) : rawTarget;
    const isInternal = typeof resolvedTarget === 'string' && !isHashLink(resolvedTarget) && !isExternalLink(resolvedTarget);
    const active = isInternal && isRouteActive(pathname, resolvedTarget, exact);
    const linkClassName = activeClassName ? joinClassNames(className, active && activeClassName) : className;

    const handleClick = (event) => {
        onClick?.(event);

        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            target ||
            !isInternal ||
            isModifiedEvent(event)
        ) {
            return;
        }

        event.preventDefault();
        navigate({ to: resolvedTarget, replace });
    };

    return (
        <a
            {...rest}
            ref={ref}
            href={typeof resolvedTarget === 'string' ? resolvedTarget : '#'}
            target={target}
            className={linkClassName}
            onClick={handleClick}
        >
            {children}
        </a>
    );
});

Link.displayName = 'RouterCompatLink';

export const NavLink = forwardRef(({ activeClassName = 'active', ...props }, ref) => (
    <Link ref={ref} activeClassName={activeClassName} {...props} />
));

NavLink.displayName = 'RouterCompatNavLink';
