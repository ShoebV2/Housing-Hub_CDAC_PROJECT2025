using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HousingHubBackend.Data;
using HousingHubBackend.Models;
using HousingHubBackend.Dtos;
using AutoMapper;
using FluentValidation;
using System.Linq;
using System.Collections.Generic;

namespace HousingHubBackend.Controllers
{
    // API Controller for managing amenities in the Housing Hub system.
    // Amenities can include facilities like gyms, swimming pools, clubhouses, etc.
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Requires authentication for all endpoints in this controller.
    public class AmenitiesController : ControllerBase
    {
        // Database context for accessing the Amenities table
        private readonly HousingHubDBContext _context;

        // AutoMapper instance for converting between models and DTOs
        private readonly IMapper _mapper;

        // Validators for creating and updating amenities
        private readonly IValidator<CreateAmenityDto> _createValidator;
        private readonly IValidator<UpdateAmenityDto> _updateValidator;

        // Constructor to inject dependencies via Dependency Injection
        public AmenitiesController(
            HousingHubDBContext context,
            IMapper mapper,
            IValidator<CreateAmenityDto> createValidator,
            IValidator<UpdateAmenityDto> updateValidator)
        {
            _context = context;
            _mapper = mapper;
            _createValidator = createValidator;
            _updateValidator = updateValidator;
        }

        // GET: api/amenities
        // Returns a list of all amenities available in the system.
        [HttpGet]
        [Authorize(Roles = "super_admin,admin,security_staff,resident")]
        public IActionResult GetAll()
        {
            var amenities = _context.Amenities.ToList();
            var dtos = _mapper.Map<IEnumerable<AmenityDto>>(amenities);
            return Ok(dtos);
        }

        // GET: api/amenities/{id}
        // Returns details of a specific amenity by its ID.
        [HttpGet("{id}")]
        [Authorize(Roles = "super_admin,admin,security_staff,resident")]
        public IActionResult Get(int id)
        {
            var amenity = _context.Amenities.Find(id);
            if (amenity == null) return NotFound();
            return Ok(_mapper.Map<AmenityDto>(amenity));
        }

        // POST: api/amenities
        // Creates a new amenity in the system.
        [HttpPost]
        [Authorize(Roles = "super_admin,admin,security_staff")]
        public IActionResult Create([FromBody] CreateAmenityDto dto)
        {
            // Map DTO to entity model
            var amenity = _mapper.Map<Amenity>(dto);

            // Save new amenity to the database
            _context.Amenities.Add(amenity);
            _context.SaveChanges();

            // Return the created amenity with 201 Created status
            return CreatedAtAction(nameof(Get), new { id = amenity.AmenityId }, _mapper.Map<AmenityDto>(amenity));
        }

        // PUT: api/amenities/{id}
        // Updates an existing amenity by its ID.
        [HttpPut("{id}")]
        [Authorize(Roles = "super_admin,admin,security_staff")]
        public IActionResult Update(int id, [FromBody] UpdateAmenityDto dto)
        {
            // Find the existing amenity
            var existing = _context.Amenities.Find(id);
            if (existing == null) return NotFound();

            // Update the entity with new values from DTO
            _mapper.Map(dto, existing);
            _context.SaveChanges();

            // Return No Content status to indicate success
            return NoContent();
        }

        // DELETE: api/amenities/{id}
        // Deletes an amenity from the system.
        [HttpDelete("{id}")]
        [Authorize(Roles = "super_admin,admin")]
        public IActionResult Delete(int id)
        {
            // Find the amenity
            var amenity = _context.Amenities.Find(id);
            if (amenity == null) return NotFound();

            // Remove it from the database
            _context.Amenities.Remove(amenity);
            _context.SaveChanges();

            // Return No Content status to indicate success
            return NoContent();
        }
    }
}
