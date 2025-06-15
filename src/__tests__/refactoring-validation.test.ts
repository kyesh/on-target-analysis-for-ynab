/**
 * Test suite to validate that all project name references have been updated
 * from "YNAB Off-Target Assignment" to "On Target Analysis for YNAB"
 */

import fs from 'fs';
import path from 'path';

describe('Project Name Refactoring Validation', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  
  // Files that should contain the new project name
  const filesToCheck = [
    'README.md',
    'package.json',
    '.env.example',
    'docs/README.md',
    'docs/OVERVIEW.md',
    'docs/PROJECT_SUMMARY.md',
    'docs/PRODUCT_REQUIREMENTS.md',
    'docs/DATA_ARCHITECTURE.md',
    'legal/TERMS_OF_SERVICE.md',
    'scripts/deploy-gcp.sh',
    'src/app/page.tsx'
  ];

  // Old project name patterns that should no longer exist
  const oldNamePatterns = [
    /YNAB Off-Target Assignment Analysis/g,
    /YNAB Off-Target Assignment/g,
    /ynab-off-target-assignment/g,
    /Off-Target Assignment Analysis/g
  ];

  // New project name patterns that should exist
  const newNamePatterns = [
    /On Target Analysis for YNAB/g,
    /on-target-analysis-for-ynab/g
  ];

  describe('File Content Validation', () => {
    filesToCheck.forEach(filePath => {
      const fullPath = path.join(projectRoot, filePath);
      
      if (fs.existsSync(fullPath)) {
        describe(`File: ${filePath}`, () => {
          let fileContent: string;
          
          beforeAll(() => {
            fileContent = fs.readFileSync(fullPath, 'utf-8');
          });

          test('should not contain old project name patterns', () => {
            oldNamePatterns.forEach(pattern => {
              const matches = fileContent.match(pattern);
              if (matches) {
                console.log(`Found old pattern "${pattern}" in ${filePath}:`, matches);
              }
              expect(matches).toBeNull();
            });
          });

          test('should contain new project name', () => {
            const hasNewName = newNamePatterns.some(pattern => {
              const result = pattern.test(fileContent);
              pattern.lastIndex = 0; // Reset regex state
              return result;
            });
            if (!hasNewName) {
              console.log(`File ${filePath} content preview:`, fileContent.substring(0, 200));
              console.log('Testing patterns:', newNamePatterns.map(p => p.toString()));
            }
            expect(hasNewName).toBe(true);
          });
        });
      } else {
        test.skip(`File ${filePath} does not exist`);
      }
    });
  });

  describe('Package.json Validation', () => {
    test('should have correct package name', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      expect(packageJson.name).toBe('on-target-analysis-for-ynab');
      expect(packageJson.description).toContain('On Target Analysis for YNAB');
    });
  });

  describe('Environment Configuration Validation', () => {
    test('.env.example should have correct app name', () => {
      const envExamplePath = path.join(projectRoot, '.env.example');
      const envContent = fs.readFileSync(envExamplePath, 'utf-8');
      
      expect(envContent).toContain('NEXT_PUBLIC_APP_NAME=On Target Analysis for YNAB');
      expect(envContent).toContain('https://ontargetanalysisforynab.com');
    });
  });

  describe('Deployment Script Validation', () => {
    test('deploy-gcp.sh should have correct service name', () => {
      const deployScriptPath = path.join(projectRoot, 'scripts/deploy-gcp.sh');
      const scriptContent = fs.readFileSync(deployScriptPath, 'utf-8');
      
      expect(scriptContent).toContain('on-target-analysis-for-ynab');
      expect(scriptContent).toContain('On Target Analysis for YNAB');
    });
  });

  describe('Domain References Validation', () => {
    test('should reference correct production domain', () => {
      const filesToCheckForDomain = [
        '.env.example',
        'README.md',
        'docs_proposed/GCP_SECRET_MANAGER_GUIDE.md'
      ];

      filesToCheckForDomain.forEach(filePath => {
        const fullPath = path.join(projectRoot, filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          expect(content).toContain('ontargetanalysisforynab.com');
        }
      });
    });
  });
});
