package com.stockviewer.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"spring.datasource.driver-class-name=org.h2.Driver",
		"spring.datasource.url=jdbc:h2:mem:stockviewer;MODE=Oracle;DB_CLOSE_DELAY=-1",
		"spring.datasource.username=sa",
		"spring.datasource.password=",
		"spring.jpa.hibernate.ddl-auto=create-drop",
		"spring.jpa.database-platform=org.hibernate.dialect.H2Dialect"
})
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
