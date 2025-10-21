using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Services
{
    public class TestService
    {
        public object GetTestData()
        {
            return new { message = "test" };
        }
    }
}