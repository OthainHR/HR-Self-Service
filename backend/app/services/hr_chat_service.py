"""
Enhanced Chat Service with HR Integration
Integrates Keka MCP functionality into chat responses
"""

import re
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, date, timedelta
from app.services.keka_mcp_service import keka_mcp_service
from app.models.hr import HRChatContext, HRChatResponse

logger = logging.getLogger(__name__)

class HRChatService:
    """
    Service to handle HR-related chat queries and provide contextual responses
    """
    
    def __init__(self):
        self.hr_keywords = {
            'profile': ['profile', 'personal', 'information', 'details', 'employee id', 'designation', 'department'],
            'leave': ['leave', 'vacation', 'time off', 'holiday', 'absent', 'pto', 'sick leave', 'casual leave'],
            'attendance': ['attendance', 'present', 'absent', 'hours worked', 'check in', 'check out', 'working hours'],
            'payslip': ['payslip', 'salary', 'pay', 'payroll', 'earnings', 'deductions', 'paycheck'],
            'holidays': ['holidays', 'public holiday', 'company holiday', 'festival', 'celebration']
        }
        
        self.intent_patterns = {
            'check_balance': r'(how many|check|show|get).*(leave|vacation|time off).*(balance|remaining|left)',
            'apply_leave': r'(apply|request|book|take).*(leave|vacation|time off)',
            'view_payslip': r'(show|get|view|download).*(payslip|salary|pay)',
            'check_attendance': r'(show|check|view).*(attendance|present|hours)',
            'view_holidays': r'(show|list|get).*(holiday|holidays)',
            'profile_info': r'(show|get|view).*(profile|personal|information)'
        }

    def detect_hr_query(self, message: str) -> HRChatContext:
        """
        Analyze message to determine if it's HR-related and extract intent
        """
        message_lower = message.lower()
        
        # Determine query type based on keywords
        query_type = 'general'
        max_matches = 0
        
        for category, keywords in self.hr_keywords.items():
            matches = sum(1 for keyword in keywords if keyword in message_lower)
            if matches > max_matches:
                max_matches = matches
                query_type = category
        
        # Extract intent
        intent = None
        entities = {}
        
        for intent_key, pattern in self.intent_patterns.items():
            if re.search(pattern, message_lower):
                intent = intent_key
                break
        
        # Extract specific entities based on intent
        if intent:
            entities = self._extract_entities(message_lower, intent)
        
        return HRChatContext(
            user_email="",  # Will be set by caller
            query_type=query_type,
            intent=intent,
            entities=entities
        )

    def _extract_entities(self, message: str, intent: str) -> Dict[str, Any]:
        """Extract specific entities from the message based on intent"""
        entities = {}
        
        if intent == 'apply_leave':
            # Extract dates if mentioned
            date_patterns = [
                r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})',  # DD/MM/YYYY or DD-MM-YYYY
                r'(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})',
                r'(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)'
            ]
            
            for pattern in date_patterns:
                matches = re.findall(pattern, message)
                if matches:
                    entities['dates_mentioned'] = matches
                    break
            
            # Extract leave type
            leave_types = ['vacation', 'sick', 'personal', 'emergency', 'casual', 'medical']
            for leave_type in leave_types:
                if leave_type in message:
                    entities['leave_type'] = leave_type
                    break
        
        elif intent == 'view_payslip':
            # Extract month/year
            months = ['january', 'february', 'march', 'april', 'may', 'june',
                     'july', 'august', 'september', 'october', 'november', 'december']
            
            for i, month in enumerate(months):
                if month in message:
                    entities['month'] = i + 1
                    break
            
            year_match = re.search(r'20\d{2}', message)
            if year_match:
                entities['year'] = int(year_match.group())
        
        elif intent == 'check_attendance':
            # Extract time period
            if 'current month' in message or 'this month' in message:
                entities['period'] = 'current_month'
            elif 'last month' in message or 'previous month' in message:
                entities['period'] = 'last_month'
        
        return entities

    async def get_hr_context_for_chat(self, user_email: str, query: str) -> Dict[str, Any]:
        """
        Get relevant HR context data for chat response
        """
        context = HRChatContext(
            user_email=user_email,
            **self.detect_hr_query(query).__dict__
        )
        
        hr_data = {}
        
        try:
            # Set authenticated user
            keka_mcp_service.set_authenticated_user(user_email)
            
            # Based on query type, fetch relevant data
            if context.query_type == 'profile' or context.intent == 'profile_info':
                profile_result = await keka_mcp_service.get_my_profile()
                hr_data['profile'] = profile_result
            
            elif context.query_type == 'leave':
                if context.intent == 'check_balance':
                    balances_result = await keka_mcp_service.get_my_leave_balances()
                    hr_data['leave_balances'] = balances_result
                elif context.intent == 'apply_leave':
                    # Get leave types and balances for application context
                    types_result = await keka_mcp_service.get_leave_types()
                    balances_result = await keka_mcp_service.get_my_leave_balances()
                    hr_data['leave_types'] = types_result
                    hr_data['leave_balances'] = balances_result
                else:
                    # Default: get balances and recent history
                    balances_result = await keka_mcp_service.get_my_leave_balances()
                    history_result = await keka_mcp_service.get_my_leave_history()
                    hr_data['leave_balances'] = balances_result
                    hr_data['leave_history'] = history_result[:5]  # Last 5 applications
            
            elif context.query_type == 'attendance':
                if context.entities.get('period') == 'current_month':
                    attendance_result = await keka_mcp_service.get_my_attendance(
                        date.today().replace(day=1), date.today()
                    )
                else:
                    # Default to current month
                    attendance_result = await keka_mcp_service.get_my_attendance(
                        date.today().replace(day=1), date.today()
                    )
                hr_data['attendance'] = attendance_result
            
            elif context.query_type == 'payslip':
                month = context.entities.get('month', date.today().month)
                year = context.entities.get('year', date.today().year)
                
                try:
                    payslip_result = await keka_mcp_service.get_my_payslip(month, year)
                    hr_data['payslip'] = payslip_result
                except:
                    # Try latest payslip if specific month/year not available
                    try:
                        payslip_result = await keka_mcp_service.get_my_payslip(
                            date.today().month, date.today().year
                        )
                        hr_data['payslip'] = payslip_result
                    except:
                        pass  # No payslip available
            
            elif context.query_type == 'holidays':
                holidays_result = await keka_mcp_service.get_upcoming_holidays()
                hr_data['holidays'] = holidays_result
            
            # Always include basic profile for personalization
            if 'profile' not in hr_data:
                try:
                    profile_result = await keka_mcp_service.get_my_profile()
                    hr_data['profile_basic'] = profile_result
                except:
                    pass
                    
        except Exception as e:
            logger.error(f"Error fetching HR context for {user_email}: {str(e)}")
            # Don't expose internal errors to users
            if "not authenticated with Keka" in str(e):
                hr_data['error'] = "Please connect your Keka account to access HR data"
            elif "Rate limit exceeded" in str(e):
                hr_data['error'] = "Too many requests. Please try again in a moment"
            elif "Service unavailable" in str(e):
                hr_data['error'] = "HR service is temporarily unavailable"
            else:
                hr_data['error'] = "Unable to fetch HR data at this time"
        
        return {
            'hr_context': context.__dict__,
            'hr_data': hr_data
        }

    def format_hr_data_for_context(self, hr_data: Dict[str, Any]) -> str:
        """
        Format HR data into a context string for the AI model
        """
        if not hr_data:
            return ""
        
        context_parts = ["Here is the employee's current HR information:\n"]
        
        # Profile information
        if 'profile' in hr_data or 'profile_basic' in hr_data:
            profile = hr_data.get('profile') or hr_data.get('profile_basic')
            if profile:
                context_parts.append(f"""
Employee Profile:
- Name: {profile.full_name}
- Employee ID: {profile.employee_id}
- Email: {profile.email}
- Designation: {profile.designation}
- Department: {profile.department}
- Join Date: {profile.join_date}
- Status: {profile.employee_status}
""")
        
        # Leave balances
        if 'leave_balances' in hr_data and hr_data['leave_balances']:
            context_parts.append("\nLeave Balances:")
            for balance in hr_data['leave_balances']:
                context_parts.append(f"- {balance.leave_type.title()}: {balance.remaining} days remaining out of {balance.total_allocated} allocated")
        
        # Leave history
        if 'leave_history' in hr_data and hr_data['leave_history']:
            context_parts.append("\nRecent Leave Applications:")
            for leave in hr_data['leave_history'][:3]:
                context_parts.append(f"- {leave.leave_type.title()}: {leave.from_date} to {leave.to_date} ({leave.status})")
        
        # Attendance
        if 'attendance' in hr_data and hr_data['attendance']:
            attendance = hr_data['attendance']
            total_days = len(attendance)
            present_days = len([a for a in attendance if a.status in ['present', 'work_from_home']])
            attendance_rate = (present_days / total_days * 100) if total_days > 0 else 0
            
            context_parts.append(f"""
Current Month Attendance:
- Total working days: {total_days}
- Days present: {present_days}
- Attendance rate: {attendance_rate:.1f}%
""")
        
        # Payslip
        if 'payslip' in hr_data and hr_data['payslip']:
            payslip = hr_data['payslip']
            context_parts.append(f"""
Latest Payslip ({payslip.month}/{payslip.year}):
- Gross Salary: ₹{payslip.gross_salary:,}
- Net Salary: ₹{payslip.net_salary:,}
- Total Deductions: ₹{payslip.total_deductions:,}
""")
        
        # Holidays
        if 'holidays' in hr_data and hr_data['holidays']:
            context_parts.append(f"\nUpcoming Holidays:")
            for holiday in hr_data['holidays'][:3]:
                context_parts.append(f"- {holiday.name}: {holiday.date} ({holiday.type})")
        
        # Leave types (for application)
        if 'leave_types' in hr_data and hr_data['leave_types']:
            context_parts.append(f"\nAvailable Leave Types:")
            for leave_type in hr_data['leave_types']:
                context_parts.append(f"- {leave_type.get('name', leave_type.get('display_name', 'Unknown'))}")
        
        return "\n".join(context_parts)

    def enhance_system_message_with_hr_context(self, base_system_message: str, hr_context: str) -> str:
        """
        Enhance the base system message with HR context
        """
        if not hr_context:
            return base_system_message
        
        enhanced_message = base_system_message + f"""

EMPLOYEE HR DATA CONTEXT:
{hr_context}

IMPORTANT HR RESPONSE GUIDELINES:
- Use the employee's actual data from the context above when answering HR questions
- For leave balance queries, provide specific numbers from the context
- For attendance questions, use the actual attendance data provided
- For payslip queries, reference the actual salary information if available
- Always personalize responses using the employee's name from the profile
- If the user asks to apply for leave, guide them to use the HR Self Service page or provide steps
- If asking about payslips, mention they can view/download them from the HR Self Service page
- Be helpful and provide actionable information based on their actual HR data

If the HR data shows any issues (like low leave balance, poor attendance), mention it supportively and suggest appropriate actions.
"""
        
        return enhanced_message

# Global instance
hr_chat_service = HRChatService()
