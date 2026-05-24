import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { readYamlFile, resolveYamlInput } from '../utils/read-yaml-file.js';
import * as fs from 'node:fs';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof fs>();
  return {
    ...actual,
    readFileSync: vi.fn(),
    statSync: vi.fn().mockReturnValue(null),
    // realpathSync: pass through to identity so containment checks work with test paths
    realpathSync: vi.fn((p: string) => p),
  };
});

const mockedReadFileSync = vi.mocked(fs.readFileSync);

// Set WORKSPACE_DIR to /home so test paths like /home/user/... pass containment check.
// getWorkspaceDir() reads env per-call, so this takes effect immediately.
const originalWorkspaceDir = process.env['WORKSPACE_DIR'];
beforeAll(() => {
  process.env['WORKSPACE_DIR'] = '/home';
});
afterAll(() => {
  if (originalWorkspaceDir === undefined) {
    delete process.env['WORKSPACE_DIR'];
  } else {
    process.env['WORKSPACE_DIR'] = originalWorkspaceDir;
  }
});

describe('readYamlFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads a .yaml file and returns contents', () => {
    mockedReadFileSync.mockReturnValue('name: test-agent\nversion: 1.0.0');
    const result = readYamlFile('/home/user/definitions/agent.yaml');
    expect(result).toBe('name: test-agent\nversion: 1.0.0');
    expect(mockedReadFileSync).toHaveBeenCalledWith(
      expect.stringContaining('agent.yaml'),
      'utf-8'
    );
  });

  it('reads a .yml file', () => {
    mockedReadFileSync.mockReturnValue('name: test');
    const result = readYamlFile('/home/user/def.yml');
    expect(result).toBe('name: test');
  });

  it('accepts .YAML extension (case-insensitive)', () => {
    mockedReadFileSync.mockReturnValue('name: test');
    const result = readYamlFile('/home/user/def.YAML');
    expect(result).toBe('name: test');
  });

  it('rejects non-YAML file extensions', () => {
    expect(() => readYamlFile('/home/user/file.json')).toThrow(
      'Invalid file extension ".json"'
    );
    expect(() => readYamlFile('/home/user/file.txt')).toThrow(
      'Invalid file extension ".txt"'
    );
    expect(() => readYamlFile('/home/user/file.js')).toThrow(
      'Invalid file extension ".js"'
    );
    expect(mockedReadFileSync).not.toHaveBeenCalled();
  });

  it('rejects files with no extension', () => {
    expect(() => readYamlFile('/home/user/passwd')).toThrow(
      'Invalid file extension ""'
    );
    expect(mockedReadFileSync).not.toHaveBeenCalled();
  });

  it('rejects paths outside WORKSPACE_DIR', () => {
    expect(() => readYamlFile('/etc/secrets.yaml')).toThrow(
      'file_path must resolve within'
    );
    expect(() => readYamlFile('/tmp/exploit.yaml')).toThrow(
      'file_path must resolve within'
    );
    expect(mockedReadFileSync).not.toHaveBeenCalled();
  });

  it('throws descriptive error for ENOENT', () => {
    const err = new Error('ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    mockedReadFileSync.mockImplementation(() => { throw err; });

    expect(() => readYamlFile('/home/user/missing.yaml')).toThrow('File not found:');
  });

  it('throws descriptive error for EACCES', () => {
    const err = new Error('EACCES') as NodeJS.ErrnoException;
    err.code = 'EACCES';
    mockedReadFileSync.mockImplementation(() => { throw err; });

    expect(() => readYamlFile('/home/user/locked.yaml')).toThrow('Permission denied:');
  });

  it('throws generic error for other fs errors', () => {
    const err = new Error('EISDIR') as NodeJS.ErrnoException;
    err.code = 'EISDIR';
    mockedReadFileSync.mockImplementation(() => { throw err; });

    expect(() => readYamlFile('/home/user/dir.yaml')).toThrow('Failed to read file:');
    expect(() => readYamlFile('/home/user/dir.yaml')).toThrow('EISDIR');
  });

  it('resolves relative paths before reading', () => {
    mockedReadFileSync.mockReturnValue('name: test');
    readYamlFile('./relative/path/file.yaml');
    // Should be called with an absolute path (resolved)
    const calledPath = mockedReadFileSync.mock.calls[0][0] as string;
    expect(calledPath).toMatch(/^\//);
    expect(calledPath).toContain('file.yaml');
  });
});

describe('resolveYamlInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when required and neither yaml nor file_path provided', () => {
    const result = resolveYamlInput({ type: 'agent' }, { required: true });
    expect(result).toHaveProperty('isError', true);
  });

  it('passes through when not required and neither provided', () => {
    const input = { type: 'agent', version: '1.0.0' };
    const result = resolveYamlInput(input, { required: false });
    expect(result).toEqual(input);
  });

  it('returns error when both yaml and file_path provided', () => {
    const result = resolveYamlInput(
      { yaml: 'inline', file_path: '/path.yaml' },
      { required: true }
    );
    expect(result).toHaveProperty('isError', true);
  });

  it('resolves file_path to yaml content', () => {
    mockedReadFileSync.mockReturnValue('name: from-file');
    const result = resolveYamlInput(
      { type: 'agent', file_path: '/home/user/def.yaml' },
      { required: true }
    );
    expect(result).toEqual({
      type: 'agent',
      file_path: '/home/user/def.yaml',
      yaml: 'name: from-file',
    });
  });

  it('passes yaml through unchanged', () => {
    const input = { type: 'agent', yaml: 'name: inline' };
    const result = resolveYamlInput(input, { required: true });
    expect(result).toEqual(input);
    expect(mockedReadFileSync).not.toHaveBeenCalled();
  });
});
