using Microsoft.AspNetCore.Mvc;
using HousingHubBackend.Data;
using HousingHubBackend.Models;
using HousingHubBackend.Dtos.Auth;
using HousingHubBackend.Services.Implementations;
using HousingHubBackend.Services.Interfaces;
using System.Linq;

namespace HousingHubBackend.Controllers
{
    // This controller handles authentication-related API endpoints (login, register, etc.)
    [ApiController]
    [Route("api/[controller]")] // Route: api/auth
    public class AuthController : ControllerBase
    {
        // Database context to access the database
        private readonly HousingHubDBContext _context;

        // Service to handle authentication logic
        private readonly AuthService _authService;

        // Service to generate JWT tokens
        private readonly JwtTokenService _jwtTokenService;

        // Service to send notifications (e.g., email)
        private readonly INotificationService _notificationService;

        // Constructor to inject dependencies via Dependency Injection (DI)
        public AuthController(
            HousingHubDBContext context,
            AuthService authService,
            JwtTokenService jwtTokenService,
            INotificationService notificationService)
        {
            _context = context;
            _authService = authService;
            _jwtTokenService = jwtTokenService;
            _notificationService = notificationService;
        }

        // POST: api/auth/login
        // Handles user login by validating credentials and returning a JWT token
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto loginDto)
        {
            // Authenticate user using provided email and password
            var user = _authService.Authenticate(loginDto.Email, loginDto.Password);

            // If authentication fails, return HTTP 401 Unauthorized
            if (user == null)
                return Unauthorized();

            // Generate JWT token for the authenticated user
            var token = _jwtTokenService.GenerateToken(user);

            // Prepare user object without exposing password
            var userDto = new {
                user.UserId,
                user.Name,
                user.Email,
                user.Phone,
                user.Role,
                user.SocietyId,
                user.FlatId,
                user.IsVerified
            };

            // Return token and user details to the client
            return Ok(new { token, user = userDto });
        }

        // POST: api/auth/register
        // Handles new user registration and sends notification to the admin
        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterUserDto registerDto)
        {
            // Check if the email already exists in the database
            if (_context.UserAccounts.Any(u => u.Email == registerDto.Email))
                return Conflict("Email already exists");

            // Create a new user object from registration details
            var user = new UserAccount
            {
                Name = registerDto.Name,
                Email = registerDto.Email,
                Phone = registerDto.Phone,
                Password = registerDto.Password, // NOTE: In real-world apps, hash the password before storing
                Role = registerDto.Role,
                SocietyId = registerDto.SocietyId,
                FlatId = registerDto.FlatId
            };

            // Save the new user via AuthService
            var createdUser = _authService.Register(user);

            // Generate JWT token for the newly registered user
            var token = _jwtTokenService.GenerateToken(createdUser);

            // Find the admin of the society where the user registered
            var admin = _context.UserAccounts
                .FirstOrDefault(u => u.SocietyId == createdUser.SocietyId && u.Role == "admin");

            // Get the flat number if available
            string flatNumber = null;
            if (createdUser.FlatId.HasValue)
            {
                var flat = _context.Flats.FirstOrDefault(f => f.FlatId == createdUser.FlatId.Value);
                flatNumber = flat?.FlatNumber;
            }

            // If admin exists, send them an email notification about the new resident
            if (admin != null && !string.IsNullOrEmpty(admin.Email))
            {
                _notificationService.SendNotification(
                    admin.Email,
                    "New Resident Registered",
                    $"A new resident has registered in your society.<br/><br/>" +
                    $"<b>Name:</b> {createdUser.Name}<br/>" +
                    $"<b>Email:</b> {createdUser.Email}<br/>" +
                    $"<b>Phone:</b> {createdUser.Phone}<br/>" +
                    $"<b>FlatId:</b> {createdUser.FlatId}<br/>" +
                    $"<b>FlatNumber:</b> {flatNumber}<br/>"
                );
            }

            // Return token to the client
            return Ok(new { token });
        }
    }
}
