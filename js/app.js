/**
 * Composition root: singurul loc unde se creează obiectele și se leagă între ele.
 * Restul claselor își primesc dependențele prin constructor (Dependency Inversion).
 */
import { firebaseConfig } from './core/firebase-config.js';
import { createFirebase } from './core/firebase.js';
import { EventBus } from './core/event-bus.js';
import { Session, Phase } from './core/session.js';
import { Router } from './core/router.js';
import { toUserMessage } from './core/errors.js';

import { UserRepository } from './repositories/user-repository.js';
import { PartnerRequestRepository } from './repositories/partner-request-repository.js';
import { CoupleRepository } from './repositories/couple-repository.js';
import { IdeaRepository } from './repositories/idea-repository.js';
import { EntryRepository } from './repositories/entry-repository.js';
import { MessageRepository } from './repositories/message-repository.js';

import { AuthService } from './services/auth-service.js';
import { ProfileService } from './services/profile-service.js';
import { PairingService } from './services/pairing-service.js';
import { MediaService, ImageCompressor } from './services/media-service.js';
import { IdeaService } from './services/idea-service.js';
import { EntryService } from './services/entry-service.js';
import { ChatService } from './services/chat-service.js';
import { CoupleDataHub } from './services/couple-data-hub.js';
import { SessionController } from './services/session-controller.js';
import { NotificationService } from './services/notification-service.js';

import { Toaster } from './ui/components/toaster.js';
import { AppShell } from './ui/components/app-shell.js';
import { SplashView, LoginView, WelcomeView } from './ui/views/entry-views.js';
import { PairView } from './ui/views/pair-view.js';
import { IdeasView } from './ui/views/ideas-view.js';
import { IdeaDetailView } from './ui/views/idea-detail-view.js';
import { JournalView } from './ui/views/journal-view.js';
import { UsView } from './ui/views/us-view.js';

/** Ce rute sunt permise în fiecare fază și unde ajungi implicit. */
const PHASE_ROUTES = {
  [Phase.ANON]: { home: '/login', allowed: ['/login'] },
  [Phase.ONBOARDING]: { home: '/welcome', allowed: ['/welcome'] },
  [Phase.PAIRING]: { home: '/pair', allowed: ['/pair'] },
  [Phase.PAIRED]: { home: '/ideas', allowed: ['/ideas', '/idea', '/journal', '/us'] },
};

function bootstrap() {
  const firebase = createFirebase(firebaseConfig);
  const bus = new EventBus();
  const session = new Session(bus);

  // Repositories
  const userRepository = new UserRepository(firebase.db);
  const partnerRequestRepository = new PartnerRequestRepository(firebase.db);
  const coupleRepository = new CoupleRepository(firebase.db);
  const ideaRepository = new IdeaRepository(firebase.db);
  const entryRepository = new EntryRepository(firebase.db);
  const messageRepository = new MessageRepository(firebase.db);

  // Services
  const mediaService = new MediaService({ storage: firebase.storage, compressor: new ImageCompressor() });
  const authService = new AuthService(firebase.auth);
  const profileService = new ProfileService({ userRepository });
  const pairingService = new PairingService({ userRepository, partnerRequestRepository, coupleRepository });
  const ideaService = new IdeaService({ ideaRepository, entryRepository, mediaService });
  const entryService = new EntryService({ entryRepository, mediaService });
  const chatService = new ChatService({ messageRepository });
  const hub = new CoupleDataHub({ ideaRepository, messageRepository, bus });
  const sessionController = new SessionController({
    authService, profileService, pairingService, userRepository, coupleRepository, partnerRequestRepository, hub, session, bus,
  });

  const toaster = new Toaster(document.getElementById('toasts'));
  const notifications = new NotificationService({ bus, toaster, session });

  const ctx = {
    bus, session, toaster, hub, sessionController,
    authService, profileService, pairingService, ideaService, entryService, chatService,
    coupleRepository, router: null,
  };

  const shell = new AppShell(ctx);
  document.getElementById('app').replaceChildren(shell.el);

  const router = new Router({
    outlet: shell.outlet,
    fallback: () => new SplashView(ctx),
    onChange: () => shell.highlight(),
    guard: (path) => {
      const phase = session.phase;
      if (phase === Phase.LOADING) return { view: new SplashView(ctx) };
      const { home, allowed } = PHASE_ROUTES[phase];
      const ok = allowed.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
      return ok ? null : { redirect: home };
    },
  });
  ctx.router = router;

  router
    .add('/login', () => new LoginView(ctx))
    .add('/welcome', () => new WelcomeView(ctx))
    .add('/pair', () => new PairView(ctx))
    .add('/ideas', () => new IdeasView(ctx))
    .add('/idea/:id', (params) => new IdeaDetailView(ctx, params))
    .add('/journal', () => new JournalView(ctx))
    .add('/us', () => new UsView(ctx));

  bus.on('session:changed', ({ phaseChanged }) => phaseChanged && router.resolve());
  bus.on('session:error', (error) => toaster.error(toUserMessage(error, 'Nu am putut încărca datele voastre. Reîncarcă pagina.')));

  notifications.start();
  router.start();
  sessionController.start();
}

bootstrap();
