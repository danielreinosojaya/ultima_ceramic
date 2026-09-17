import {
    createContext,
    createElement,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react';
import type { AppView, GroupTechnique } from '../types';
import { SPECIAL_EVENT_CONFIGS } from '../config/specialEventConfigs';

export type AppModalId =
    | 'events'
    | 'couplesTour'
    | 'openStudio'
    | 'userInfo'
    | 'policy'
    | 'bookingType'
    | 'classInfo'
    | 'myClassesPrompt'
    | null;

export type CouplesTechnique = 'potters_wheel' | 'molding' | null;

export interface NavSnapshot {
    view: AppView;
    slug: string | null;
    modal: AppModalId;
    subStep: string | null;
    couplesTechnique: CouplesTechnique;
}

export interface InitialRoute {
    view: AppView;
    specialEventSlug: string | null;
    isAdmin: boolean;
    isCashierMode: boolean;
    isClientDeliveryMode: boolean;
    adminModule: 'main' | 'timecards' | null;
    adminCode: string;
    proofUploadCode: string | null;
    giftcardRedeemBookingCode: string | null;
    giftcardRedeemPrefillCode: string | null;
    prefillTechnique: GroupTechnique | null;
    paintingDeliveryId: string | null;
}

interface HistoryState {
    __ucNav?: NavSnapshot;
}

interface SubStepContextValue {
    subStep: string | null;
    setSubStep: (step: string | null, opts?: { replace?: boolean }) => void;
}

const NavigationSubStepContext = createContext<SubStepContextValue>({
    subStep: null,
    setSubStep: () => {},
});

const EVENT_PATH_VIEWS: AppView[] = [
    'special_event_booking',
    'special_event_admin',
    'rumcom_booking',
    'rumcom_admin',
    'valentine_landing',
    'valentine_form',
    'valentine_success',
];

function looksLikeBookingCode(value: string): boolean {
    const v = value.trim().toUpperCase();
    return v.startsWith('C-') || v.startsWith('ALMA') || v.includes('ALMA') || v.length >= 8;
}

export function parseInitialRoute(location: Location = window.location): InitialRoute {
    const urlParams = new URLSearchParams(location.search);
    const pathname = location.pathname;
    const href = location.href;

    const empty: InitialRoute = {
        view: 'welcome',
        specialEventSlug: null,
        isAdmin: false,
        isCashierMode: false,
        isClientDeliveryMode: false,
        adminModule: null,
        adminCode: '',
        proofUploadCode: null,
        giftcardRedeemBookingCode: null,
        giftcardRedeemPrefillCode: null,
        prefillTechnique: null,
        paintingDeliveryId: null,
    };

    const comprobanteCode = urlParams.get('comprobante');
    if (comprobanteCode) {
        return {
            ...empty,
            view: 'proof_upload',
            proofUploadCode: comprobanteCode.toUpperCase().trim(),
        };
    }

    const giftcardBookingParam = urlParams.get('giftcard') || urlParams.get('redimir');
    if (giftcardBookingParam && giftcardBookingParam.toUpperCase() !== 'TRUE' && looksLikeBookingCode(giftcardBookingParam)) {
        return {
            ...empty,
            view: 'giftcard_redeem_booking',
            giftcardRedeemBookingCode: giftcardBookingParam.toUpperCase().trim(),
        };
    }
    if (pathname.includes('/giftcard/redeem') || href.includes('/giftcard/redeem')) {
        const bookingFromPath = urlParams.get('booking') || urlParams.get('reserva');
        const gcCode = urlParams.get('code');
        return {
            ...empty,
            view: 'giftcard_redeem_booking',
            giftcardRedeemBookingCode: bookingFromPath ? bookingFromPath.toUpperCase().trim() : null,
            giftcardRedeemPrefillCode: gcCode ? gcCode.toUpperCase().trim() : null,
        };
    }

    if (pathname.includes('/sanvalentin') || href.includes('/sanvalentin') || urlParams.get('sanvalentin') === 'true') {
        return { ...empty, view: 'valentine_landing' };
    }

    for (const slug of Object.keys(SPECIAL_EVENT_CONFIGS)) {
        const adminPath = `/${slug}-admin`;
        if (pathname.includes(adminPath) || urlParams.get(`${slug}admin`) === 'true') {
            return { ...empty, view: 'special_event_admin', specialEventSlug: slug };
        }
    }

    for (const slug of Object.keys(SPECIAL_EVENT_CONFIGS)) {
        const eventPath = `/${slug}`;
        if (pathname.includes(eventPath) || urlParams.get(slug) === 'true') {
            return { ...empty, view: 'special_event_booking', specialEventSlug: slug };
        }
    }

    if (pathname.includes('/rumcomadmin') || urlParams.get('rumcomadmin') === 'true') {
        return { ...empty, view: 'rumcom_admin' };
    }

    if (pathname.includes('/rumcom') || urlParams.get('rumcom') === 'true') {
        return { ...empty, view: 'rumcom_booking' };
    }

    if (pathname.includes('/cuadre') || href.includes('/cuadre') || urlParams.get('cuadre') === 'true') {
        return { ...empty, isCashierMode: true };
    }

    const bookingParam = urlParams.get('booking') || urlParams.get('product');
    const techniqueParam = urlParams.get('technique');
    if (bookingParam === 'painting' || techniqueParam === 'painting') {
        return {
            ...empty,
            view: 'painting_booking',
            prefillTechnique: 'painting',
            paintingDeliveryId: urlParams.get('deliveryId'),
        };
    }

    const result = { ...empty };
    if (urlParams.get('admin') === 'true') {
        result.isAdmin = true;
        const code = urlParams.get('code');
        if (code) result.adminCode = code;
    }
    if (urlParams.get('clientMode') === 'delivery') {
        result.isClientDeliveryMode = true;
    }
    if (urlParams.get('module') === 'timecards') {
        result.adminModule = 'timecards';
        result.adminCode = urlParams.get('code') || result.adminCode || 'ADMIN2025';
    }
    return result;
}

export function navEquals(a: NavSnapshot, b: NavSnapshot): boolean {
    return (
        a.view === b.view &&
        a.slug === b.slug &&
        a.modal === b.modal &&
        a.subStep === b.subStep &&
        a.couplesTechnique === b.couplesTechnique
    );
}

function findLastIndex<T>(arr: T[], pred: (item: T) => boolean): number {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (pred(arr[i])) return i;
    }
    return -1;
}

function dedicatedPathFor(snapshot: NavSnapshot): string | undefined {
    if (snapshot.view === 'special_event_booking' && snapshot.slug) return `/${snapshot.slug}`;
    if (snapshot.view === 'special_event_admin' && snapshot.slug) return `/${snapshot.slug}-admin`;
    if (snapshot.view === 'rumcom_booking') return '/rumcom';
    if (snapshot.view === 'rumcom_admin') return '/rumcomadmin';
    if (snapshot.view === 'valentine_landing' || snapshot.view === 'valentine_form' || snapshot.view === 'valentine_success') {
        return '/sanvalentin';
    }
    return undefined;
}

export function urlForSnapshot(snapshot: NavSnapshot, location: Location = window.location): string | undefined {
    const target = dedicatedPathFor(snapshot);
    if (target) {
        return location.pathname === target ? undefined : target;
    }
    if (EVENT_PATH_VIEWS.includes(snapshot.view)) return undefined;
    const eventPaths = [
        '/sanvalentin',
        '/rumcom',
        '/rumcomadmin',
        ...Object.keys(SPECIAL_EVENT_CONFIGS).flatMap((slug) => [`/${slug}`, `/${slug}-admin`]),
    ];
    if (eventPaths.some((p) => location.pathname === p)) return '/';
    return undefined;
}

export function useAppNavigationHistory(options: {
    view: AppView;
    setView: Dispatch<SetStateAction<AppView>>;
    specialEventSlug: string | null;
    setSpecialEventSlug: Dispatch<SetStateAction<string | null>>;
    activeModal: AppModalId;
    restoreModal: (modal: AppModalId) => void;
    couplesTechnique: CouplesTechnique;
    setCouplesTechnique: Dispatch<SetStateAction<CouplesTechnique>>;
}): { subStepContext: SubStepContextValue } {
    const {
        view,
        setView,
        specialEventSlug,
        setSpecialEventSlug,
        activeModal,
        restoreModal,
        couplesTechnique,
        setCouplesTechnique,
    } = options;

    const [subStep, setSubStepState] = useState<string | null>(null);
    const replaceSubStepRef = useRef(false);
    const poppingRef = useRef(false);
    const initializedRef = useRef(false);
    const stackRef = useRef<NavSnapshot[]>([]);
    const viewRef = useRef(view);
    const subStepOwnerRef = useRef<AppView | null>(null);
    const restoreModalRef = useRef(restoreModal);
    viewRef.current = view;
    restoreModalRef.current = restoreModal;

    const setSubStep = useCallback((step: string | null, opts?: { replace?: boolean }) => {
        replaceSubStepRef.current = opts?.replace === true;
        subStepOwnerRef.current = step == null ? null : viewRef.current;
        setSubStepState(step);
    }, []);

    const snapshot: NavSnapshot = {
        view,
        slug: specialEventSlug,
        modal: activeModal,
        subStep: subStepOwnerRef.current === view ? subStep : null,
        couplesTechnique: view === 'couples_experience' ? couplesTechnique : null,
    };

    useEffect(() => {
        const onPop = (event: PopStateEvent) => {
            const next = (event.state as HistoryState | null)?.__ucNav;
            if (!next) {
                return;
            }
            poppingRef.current = true;
            const stack = stackRef.current;
            const idx = findLastIndex(stack, (item) => navEquals(item, next));
            if (idx >= 0) {
                stack.length = idx + 1;
            } else {
                stack.push(next);
            }
            subStepOwnerRef.current = next.subStep ? next.view : null;
            setView(next.view);
            setSpecialEventSlug(next.slug);
            setCouplesTechnique(next.couplesTechnique);
            setSubStepState(next.subStep);
            restoreModalRef.current(next.modal);
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, [setCouplesTechnique, setSpecialEventSlug, setView]);

    useEffect(() => {
        const next = snapshot;

        if (!initializedRef.current) {
            initializedRef.current = true;
            stackRef.current = [next];
            const currentState = (window.history.state || {}) as HistoryState;
            window.history.replaceState({ ...currentState, __ucNav: next }, '');
            return;
        }

        if (poppingRef.current) {
            poppingRef.current = false;
            return;
        }

        const stack = stackRef.current;
        const top = stack[stack.length - 1];
        if (top && navEquals(top, next)) {
            replaceSubStepRef.current = false;
            return;
        }

        const sameModule =
            top &&
            top.view === next.view &&
            top.slug === next.slug &&
            top.modal === next.modal &&
            top.couplesTechnique === next.couplesTechnique;
        const shouldReplaceSubStep =
            !!sameModule && (replaceSubStepRef.current || top.subStep == null);
        replaceSubStepRef.current = false;

        if (shouldReplaceSubStep) {
            stack[stack.length - 1] = next;
            window.history.replaceState({ __ucNav: next }, '', urlForSnapshot(next));
            return;
        }

        const ancestorIdx = findLastIndex(stack, (item) => navEquals(item, next));
        if (ancestorIdx >= 0 && ancestorIdx < stack.length - 1) {
            window.history.go(ancestorIdx - (stack.length - 1));
            return;
        }

        stack.push(next);
        window.history.pushState({ __ucNav: next }, '', urlForSnapshot(next));
    }, [snapshot.view, snapshot.slug, snapshot.modal, snapshot.subStep, snapshot.couplesTechnique]);

    const subStepContext = useMemo<SubStepContextValue>(
        () => ({ subStep, setSubStep }),
        [subStep, setSubStep]
    );

    return { subStepContext };
}

export function NavigationSubStepProvider({
    value,
    children,
}: {
    value: SubStepContextValue;
    children: ReactNode;
}) {
    return createElement(NavigationSubStepContext.Provider, { value }, children);
}

export function useNavigationSubStep<T extends string | number>(
    step: T,
    setStep: (next: T) => void
): void {
    const ctx = useContext(NavigationSubStepContext);
    const isFirst = useRef(true);
    const applyingRestore = useRef(false);
    const setStepRef = useRef(setStep);
    setStepRef.current = setStep;

    const setSubStepRef = useRef(ctx.setSubStep);
    setSubStepRef.current = ctx.setSubStep;

    useEffect(() => {
        if (applyingRestore.current) {
            applyingRestore.current = false;
            return;
        }
        setSubStepRef.current(String(step), { replace: isFirst.current });
        isFirst.current = false;
    }, [step]);

    useEffect(() => {
        if (ctx.subStep == null) return;
        if (String(step) === ctx.subStep) return;
        const parsed = (typeof step === 'number' ? Number(ctx.subStep) : ctx.subStep) as T;
        if (typeof step === 'number' && Number.isNaN(parsed as number)) return;
        applyingRestore.current = true;
        setStepRef.current(parsed);
    }, [ctx.subStep, step]);
}
