# Remaining VAPT Fixes Required

**Version:** 1.0  
**Date:** 2025-01-03  
**Status:** Critical fixes needed to pass VAPT retest  
**Source:** ess_vapt_remediation_plan_markdown_aug_2025.md  

---

## 🚨 Critical Fixes (Must Complete Before Retest)

### F2: Supabase Key Exposure & RLS Enforcement

**Status:** ❌ NOT FIXED - Critical

**Actions Required:**
1. **Rotate Supabase Keys Immediately**
   - Go to Supabase Dashboard → Settings → API
   - Regenerate `anon` key and `service_role` key
   - Update environment variables in all deployments

2. **Environment Variable Updates**
   ```bash
   # Frontend (Vercel)
   REACT_APP_SUPABASE_URL=https://your-new-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your_new_anon_key
   REACT_APP_API_URL=https://hr-self-service.onrender.com
   
   # Backend (Render)
   SUPABASE_URL=https://your-new-project.supabase.co
   SUPABASE_KEY=your_new_service_role_key
   CORS_ORIGINS=https://ess.othain.com,https://admin.othain.com,https://staging-ess.othain.com
   ```

3. **Enforce RLS Policies**
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
   
   -- Example RLS policy for tickets
   CREATE POLICY tickets_select_own ON public.tickets FOR SELECT
   USING (auth.uid() = requested_by::uuid);
   
   CREATE POLICY tickets_insert_own ON public.tickets FOR INSERT
   WITH CHECK (auth.uid() = requested_by::uuid);
   ```

4. **Storage Bucket Security**
   ```sql
   -- Make ticket-attachments bucket private
   UPDATE storage.buckets SET public = false WHERE id = 'ticket-attachments';
   
   -- Add RLS policies for storage
   CREATE POLICY storage_select_own ON storage.objects FOR SELECT
   USING (bucket_id = 'ticket-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

---

### F5: CORS Configuration - Edge Function

**Status:** ✅ FIXED - Medium

**File:** `supabase/functions/reset-password/index.ts`

**Completed:** Replaced all `Access-Control-Allow-Origin: *` with `https://ess.othain.com`, added 204 OPTIONS handler, and Vary: Origin header.

---

### F6/F7/F9: Security Headers - Server.py

**Status:** ✅ FIXED - Low

**File:** `server.py`

**Completed:** Added security headers middleware with X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP Report-Only, X-XSS-Protection, and conditional HSTS. Also added rate limiting for /api/auth/token.

---

## 🔧 Additional Hardening (Recommended)

### F3: Enhanced Password Policy

**Status:** ✅ PARTIALLY FIXED

**Completed:**
1. **Block Common Passwords** - Added local common password list check in `backend/app/routers/auth.py` with `backend/app/utils/common_passwords.txt`

**Remaining Actions:**
1. **Add MFA for Admins**
   - Implement TOTP or SMS-based MFA
   - Require for admin@example.com and similar privileged accounts

### F4: File Upload Hardening

**Status:** ✅ PARTIALLY FIXED

**Completed:**
1. **Client-side validation** - Added file type, size, and MIME validation in `frontend/src/features/ticketing/components/TicketForm.jsx`
2. **Server-side validation** - Added size cap, extension allowlist, content-type checks, and binary rejection in `backend/app/routers/knowledge.py`
3. **Filename sanitization** - Added sanitizeFilename function to prevent path traversal

**Remaining Actions:**
1. **Server-side Magic Byte Validation**
   ```python
   # Add to backend/app/routers/knowledge.py
   import magic
   
   def validate_file_content(file_content, expected_ext):
       mime = magic.from_buffer(file_content, mime=True)
       # Validate against expected MIME types
       return mime in ALLOWED_MIME_TYPES
   ```

2. **Content-Disposition Headers**
   ```python
   # When serving files, add:
   response.headers["Content-Disposition"] = "attachment; filename=filename.ext"
   ```

### F10: Access Control Testing

**Status:** ❌ NOT IMPLEMENTED

**Actions Required:**
1. **Add Authorization Tests**
   ```python
   # Create backend/tests/test_authz.py
   def test_user_cannot_access_other_tickets():
       # Test RLS enforcement
       pass
   
   def test_admin_can_access_all_tickets():
       # Test admin privileges
       pass
   ```

2. **Verify All Endpoints Have Auth Checks**
   - Audit every API endpoint
   - Ensure proper user context validation

### F11: Injection Prevention

**Status:** ✅ PARTIALLY FIXED

**Completed:**
1. **Input validation** - Added payload blocklist checks in `backend/app/routers/knowledge.py` and `frontend/src/features/ticketing/components/TicketForm.jsx`
2. **Parameterized queries** - Using SQLAlchemy ORM and parameterized queries in backend

**Remaining Actions:**
1. **Audit All Database Queries**
   - Ensure all queries use parameterized statements
   - Check RPC functions for SQL injection risks

2. **Add Input Sanitization**
   ```python
   # Add to all input endpoints
   import bleach
   
   def sanitize_input(text):
       return bleach.clean(text, strip=True)
   ```

### F13: Security Monitoring

**Status:** ❌ NOT IMPLEMENTED

**Actions Required:**
1. **Add WAF Rules** (Cloudflare/NGINX)
   - Block common attack patterns
   - Rate limit suspicious requests

2. **CI/CD Security Scanning**
   ```yaml
   # Add to .github/workflows/security.yml
   - name: Run security scans
     run: |
       pip install safety bandit
       safety check
       bandit -r backend/
   ```

3. **Monitoring & Alerting**
   - Set up alerts for failed login attempts
   - Monitor for CORS/header regressions
   - Track unusual API usage patterns

---

## 📋 Pre-Retest Checklist

- [ ] **F2**: Supabase keys rotated and RLS policies enforced
- [x] **F5**: Edge function CORS fixed
- [x] **F6/F7/F9**: Security headers added to server.py
- [x] **F3**: Password policy enhanced (common passwords blocked)
- [x] **F4**: File uploads hardened (client & server validation)
- [x] **F11**: Input validation and parameterized queries implemented
- [ ] **F10**: Access control tests added (optional)
- [ ] **F13**: Security monitoring enabled (optional)

---

## 🚀 Deployment Order

1. **Immediate (Critical)**
   - Rotate Supabase keys
   - Update environment variables
   - Deploy backend with RLS policies
   - ~~Fix Edge function CORS~~ ✅ DONE
   - ~~Add security headers to server.py~~ ✅ DONE

2. **Before Retest**
   - Verify all endpoints work with new keys
   - Test file uploads with new restrictions
   - Confirm CORS is working correctly

3. **Post-Retest (Hardening)**
   - Implement remaining security measures
   - Add monitoring and alerting
   - Set up CI/CD security scanning

---

## 📞 Support

If you need help implementing any of these fixes, refer to:
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Security Headers Guide](https://owasp.org/www-project-secure-headers/)
- [FastAPI Security Best Practices](https://fastapi.tiangolo.com/tutorial/security/)

**Priority:** Complete Critical fixes (F2) before retest to ensure passing results. F5, F6/F7/F9, F3, F4, and F11 are now implemented.
