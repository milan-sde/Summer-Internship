import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StorageService]
    });
    service = TestBed.inject(StorageService);
    // Clear sessionStorage before each test to ensure a clean state
    sessionStorage.clear();
  });

  afterEach(() => {
    // Clean up sessionStorage after each test
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store and retrieve access token', async () => {
    const testToken = 'test-access-token';
    await service.setAccessToken(testToken);
    const retrievedToken = await service.getAccessToken();
    expect(retrievedToken).toBe(testToken);
  });

  it('should store and retrieve refresh token', async () => {
    const testToken = 'test-refresh-token';
    await service.setRefreshToken(testToken);
    const retrievedToken = await service.getRefreshToken();
    expect(retrievedToken).toBe(testToken);
  });

  it('should store, retrieve, and parse user object', async () => {
    const testUser = { id: '123', email: 'test@example.com', role: 'Brand' };
    await service.setUser(testUser);
    const retrievedUser = await service.getUser();
    expect(retrievedUser).toEqual(testUser);
  });

  it('should return null if user is not in storage', async () => {
    const retrievedUser = await service.getUser();
    expect(retrievedUser).toBeNull();
  });

  it('should check if user is logged in correctly', async () => {
    expect(await service.isLoggedIn()).toBeFalse();
    await service.setAccessToken('some-token');
    expect(await service.isLoggedIn()).toBeTrue();
  });

  it('should clear storage on clear()', async () => {
    await service.setAccessToken('some-token');
    await service.setUser({ name: 'Test' });
    await service.clear();
    
    expect(await service.getAccessToken()).toBeNull();
    expect(await service.getUser()).toBeNull();
  });
});

