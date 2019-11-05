
// File: node_modules\openzeppelin-solidity\contracts\token\ERC20\ERC20Basic.sol 

pragma solidity >= 0.5.0 < 0.6.0; 


/** 
 * @title ERC20Basic 
 * @dev Simpler version of ERC20 interface 
 * @dev see https://github.com/ethereum/EIPs/issues/179 
 */ 
contract ERC20Basic { 
	function totalSupply() public view returns (uint256); 
	function balanceOf(address who) public view returns (uint256); 
	function transfer(address to, uint256 value) public returns (bool); 
	event Transfer(address indexed from, address indexed to, uint256 value); 
} 

// File: node_modules\openzeppelin-soliditgy\contracts\math\SafeMath.sol 

pragma solidity >= 0.5.0 < 0.6.0; 

/** 
 * @title SafeMath 
 * @dev Math operations with safety checks that throw on error 
 */ 
library SafeMath { 

	/** 
	 * @dev Multiplies two numbers, throws on overflow. 
	 */ 
	function mul(uint256 a, uint256 b) internal pure returns (uint256 c) { 
		if (a == 0) { 
			return 0; 
		} 
		c = a * b; 
		assert(c / a == b); 
		return c; 
	} 

	/** 
	 * @dev Integer division of two numbers, truncating the quotient. 
	 */ 
	function div(uint256 a, uint256 b) internal pure returns (uint256) { 
		// assert(b > 0); // Solidity automatically throws when dividing by 0 
		// uint256 c = a / b; 
		// assert(a == b * c + a % b); // There is no case in which this doesn't hold 
		return a / b; 
	} 

	/** 
	 * @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend). 
	 */ 
	function sub(uint256 a, uint256 b) internal pure returns (uint256) { 
		assert(b <= a); 
		return a - b; 
	} 

	/** 
	 * @dev Adds two numbers, throws on overflow. 
	 */ 
	function add(uint256 a, uint256 b) internal pure returns (uint256 c) { 
		c = a + b; 
		assert(c >= a); 
		return c; 
	} 
} 

// File: node_modules\openzeppelin-solidity\contracts\token\ERC20\BasicToken.sol 

pragma solidity >= 0.5.0 < 0.6.0; 

/** 
 * @title Basic token 
 * @dev Basic version of StandardToken, with no allowances. 
 */ 
contract BasicToken is ERC20Basic { 
	using SafeMath for uint256; 

	mapping(address => uint256) balances; 

	uint256 totalSupply_; 

	/** 
	 * @dev total number of tokens in existence 
	 */ 
	function totalSupply() public view returns (uint256) { 
		return totalSupply_; 
	} 

	/** 
	 * @dev transfer token for a specified address 
	 * @param _to The address to transfer to. 
	 * @param _value The amount to be transferred. 
	 */ 
	function transfer(address _to, uint256 _value) public returns (bool) { 
		require(_to != address(0)); 
		require(_value <= balances[msg.sender]); 

		balances[msg.sender] = balances[msg.sender].sub(_value); 
		balances[_to] = balances[_to].add(_value); 
		emit Transfer(msg.sender, _to, _value); 
		return true; 
	} 

	/** 
	 * @dev Gets the balance of the specified address. 
	 * @param _owner The address to query the the balance of. 
	 * @return An uint256 representing the amount owned by the passed address. 
	 */ 
	function balanceOf(address _owner) public view returns (uint256) { 
		return balances[_owner]; 
	} 

} 

// File: node_modules\openzeppelin-solidity\contracts\token\ERC20\ERC20.sol 

pragma solidity >= 0.5.0 < 0.6.0; 

/** 
 * @title ERC20 interface 
 * @dev see https://github.com/ethereum/EIPs/issues/20 
 */ 
contract ERC20 is ERC20Basic { 
	function allowance(address owner, address spender) public view returns (uint256); 
	function transferFrom(address from, address to, uint256 value) public returns (bool); 
	function approve(address spender, uint256 value) public returns (bool); 
	event Approval(address indexed owner, address indexed spender, uint256 value); 
} 

// File: node_modules\openzeppelin-solidity\contracts\token\ERC20\StandardToken.sol 

pragma solidity >= 0.5.0 < 0.6.0; 

/** 
 * @title Standard ERC20 token 
 * 
 * @dev Implementation of the basic standard token. 
 * @dev https://github.com/ethereum/EIPs/issues/20 
 * @dev Based on code by FirstBlood: https://github.com/Firstbloodio/token/blob/master/smart_contract/FirstBloodToken.sol 
 */ 
contract StandardToken is ERC20, BasicToken { 

	mapping (address => mapping (address => uint256)) internal allowed; 


	/** 
	 * @dev Transfer tokens from one address to another 
	 * @param _from address The address which you want to send tokens from 
	 * @param _to address The address which you want to transfer to 
	 * @param _value uint256 the amount of tokens to be transferred 
	 */ 
	function transferFrom(address _from, address _to, uint256 _value) public returns (bool) { 
		require(_to != address(0)); 
		require(_value <= balances[_from]); 
		require(_value <= allowed[_from][msg.sender]); 

		balances[_from] = balances[_from].sub(_value); 
		balances[_to] = balances[_to].add(_value); 
		allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value); 
		emit Transfer(_from, _to, _value); 
		return true; 
	} 

	/** 
	 * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender. 
	 * 
	 * Beware that changing an allowance with this method brings the risk that someone may use both the old 
	 * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this 
	 * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards: 
	 * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729 
	 * @param _spender The address which will spend the funds. 
	 * @param _value The amount of tokens to be spent. 
	 */ 
	function approve(address _spender, uint256 _value) public returns (bool) { 
		allowed[msg.sender][_spender] = _value; 
		emit Approval(msg.sender, _spender, _value); 
		return true; 
	} 

	/** 
	 * @dev Function to check the amount of tokens that an owner allowed to a spender. 
	 * @param _owner address The address which owns the funds. 
	 * @param _spender address The address which will spend the funds. 
	 * @return A uint256 specifying the amount of tokens still available for the spender. 
	 */ 
	function allowance(address _owner, address _spender) public view returns (uint256) { 
		return allowed[_owner][_spender]; 
	} 

	/** 
	 * @dev Increase the amount of tokens that an owner allowed to a spender. 
	 * 
	 * approve should be called when allowed[_spender] == 0. To increment 
	 * allowed value is better to use this function to avoid 2 calls (and wait until 
	 * the first transaction is mined) 
	 * From MonolithDAO Token.sol 
	 * @param _spender The address which will spend the funds. 
	 * @param _addedValue The amount of tokens to increase the allowance by. 
	 */ 
	function increaseApproval(address _spender, uint _addedValue) public returns (bool) { 
		allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue); 
		emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]); 
		return true; 
	} 

	/** 
	 * @dev Decrease the amount of tokens that an owner allowed to a spender. 
	 * 
	 * approve should be called when allowed[_spender] == 0. To decrement 
	 * allowed value is better to use this function to avoid 2 calls (and wait until 
	 * the first transaction is mined) 
	 * From MonolithDAO Token.sol 
	 * @param _spender The address which will spend the funds. 
	 * @param _subtractedValue The amount of tokens to decrease the allowance by. 
	 */ 
	function decreaseApproval(address _spender, uint _subtractedValue) public returns (bool) { 
		uint oldValue = allowed[msg.sender][_spender]; 
		if (_subtractedValue > oldValue) { 
			allowed[msg.sender][_spender] = 0; 
		} else { 
			allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue); 
		} 
		emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]); 
		return true; 
	} 

} 

// File: contracts\SavingAccount.sol 
pragma solidity >= 0.5.0 < 0.6.0; 

import "./external/provableAPI.sol"; 
// import "github.com/Arachnid/solidity-stringutils/strings.sol"; 

library strings { 
	struct slice { 
		uint _len; 
		uint _ptr; 
	} 

	function memcpy(uint dest, uint src, uint len) private pure { 
		// Copy word-length chunks while possible 
		for(; len >= 32; len -= 32) { 
			assembly { 
				mstore(dest, mload(src)) 
			} 
			dest += 32; 
			src += 32; 
		} 

		// Copy remaining bytes 
		uint mask = 256 ** (32 - len) - 1; 
		assembly { 
			let srcpart := and(mload(src), not(mask)) 
				let destpart := and(mload(dest), mask) 
				mstore(dest, or(destpart, srcpart)) 
		} 
	} 

	/* 
	 * @dev Returns a slice containing the entire string. 
	 * @param self The string to make a slice from. 
	 * @return A newly allocated slice containing the entire string. 
	 */ 
	function toSlice(string memory self) internal pure returns (slice memory) { 
		uint ptr; 
		assembly { 
ptr := add(self, 0x20) 
		} 
		return slice(bytes(self).length, ptr); 
	} 

	/* 
	 * @dev Returns the length of a null-terminated bytes32 string. 
	 * @param self The value to find the length of. 
	 * @return The length of the string, from 0 to 32. 
	 */ 
	function len(bytes32 self) internal pure returns (uint) { 
		uint ret; 
		if (self == 0) 
			return 0; 
		if (uint(self) & 0xffffffffffffffffffffffffffffffff == 0) { 
			ret += 16; 
			self = bytes32(uint(self) / 0x100000000000000000000000000000000); 
		} 
		if (uint(self) & 0xffffffffffffffff == 0) { 
			ret += 8; 
			self = bytes32(uint(self) / 0x10000000000000000); 
		} 
		if (uint(self) & 0xffffffff == 0) { 
			ret += 4; 
			self = bytes32(uint(self) / 0x100000000); 
		} 
		if (uint(self) & 0xffff == 0) { 
			ret += 2; 
			self = bytes32(uint(self) / 0x10000); 
		} 
		if (uint(self) & 0xff == 0) { 
			ret += 1; 
		} 
		return 32 - ret; 
	} 

	/* 
	 * @dev Returns a slice containing the entire bytes32, interpreted as a 
	 *      null-terminated utf-8 string. 
	 * @param self The bytes32 value to convert to a slice. 
	 * @return A new slice containing the value of the input argument up to the 
	 *         first null. 
	 */ 
	function toSliceB32(bytes32 self) internal pure returns (slice memory ret) { 
		// Allocate space for `self` in memory, copy it there, and point ret at it 
		assembly { 
			let ptr := mload(0x40) 
				mstore(0x40, add(ptr, 0x20)) 
				mstore(ptr, self) 
				mstore(add(ret, 0x20), ptr) 
		} 
		ret._len = len(self); 
	} 

	/* 
	 * @dev Returns a new slice containing the same data as the current slice. 
	 * @param self The slice to copy. 
	 * @return A new slice containing the same data as `self`. 
	 */ 
	function copy(slice memory self) internal pure returns (slice memory) { 
		return slice(self._len, self._ptr); 
	} 

	/* 
	 * @dev Copies a slice to a new string. 
	 * @param self The slice to copy. 
	 * @return A newly allocated string containing the slice's text. 
	 */ 
	function toString(slice memory self) internal pure returns (string memory) { 
		string memory ret = new string(self._len); 
		uint retptr; 
		assembly { retptr := add(ret, 32) } 

		memcpy(retptr, self._ptr, self._len); 
		return ret; 
	} 

	/* 
	 * @dev Returns the length in runes of the slice. Note that this operation 
	 *      takes time proportional to the length of the slice; avoid using it 
	 *      in loops, and call `slice.empty()` if you only need to know whether 
	 *      the slice is empty or not. 
	 * @param self The slice to operate on. 
	 * @return The length of the slice in runes. 
	 */ 
	function len(slice memory self) internal pure returns (uint l) { 
		// Starting at ptr-31 means the LSB will be the byte we care about 
		uint ptr = self._ptr - 31; 
		uint end = ptr + self._len; 
		for (l = 0; ptr < end; l++) { 
			uint8 b; 
			assembly { b := and(mload(ptr), 0xFF) } 
			if (b < 0x80) { 
				ptr += 1; 
			} else if(b < 0xE0) { 
				ptr += 2; 
			} else if(b < 0xF0) { 
				ptr += 3; 
			} else if(b < 0xF8) { 
				ptr += 4; 
			} else if(b < 0xFC) { 
				ptr += 5; 
			} else { 
				ptr += 6; 
			} 
		} 
	} 

	/* 
	 * @dev Returns true if the slice is empty (has a length of 0). 
	 * @param self The slice to operate on. 
	 * @return True if the slice is empty, False otherwise. 
	 */ 
	function empty(slice memory self) internal pure returns (bool) { 
		return self._len == 0; 
	} 

	/* 
	 * @dev Returns a positive number if `other` comes lexicographically after 
	 *      `self`, a negative number if it comes before, or zero if the 
	 *      contents of the two slices are equal. Comparison is done per-rune, 
	 *      on unicode codepoints. 
	 * @param self The first slice to compare. 
	 * @param other The second slice to compare. 
	 * @return The result of the comparison. 
	 */ 
	function compare(slice memory self, slice memory other) internal pure returns (int) { 
		uint shortest = self._len; 
		if (other._len < self._len) 
			shortest = other._len; 

		uint selfptr = self._ptr; 
		uint otherptr = other._ptr; 
		for (uint idx = 0; idx < shortest; idx += 32) { 
			uint a; 
			uint b; 
			assembly { 
a := mload(selfptr) 
	   b := mload(otherptr) 
			} 
			if (a != b) { 
				// Mask out irrelevant bytes and check again 
				uint256 mask = uint256(-1); // 0xffff... 
				if(shortest < 32) { 
					mask = ~(2 ** (8 * (32 - shortest + idx)) - 1); 
				} 
				uint256 diff = (a & mask) - (b & mask); 
				if (diff != 0) 
					return int(diff); 
			} 
			selfptr += 32; 
			otherptr += 32; 
		} 
		return int(self._len) - int(other._len); 
	} 

	/* 
	 * @dev Returns true if the two slices contain the same text. 
	 * @param self The first slice to compare. 
	 * @param self The second slice to compare. 
	 * @return True if the slices are equal, false otherwise. 
	 */ 
	function equals(slice memory self, slice memory other) internal pure returns (bool) { 
		return compare(self, other) == 0; 
	} 

	/* 
	 * @dev Extracts the first rune in the slice into `rune`, advancing the 
	 *      slice to point to the next rune and returning `self`. 
	 * @param self The slice to operate on. 
	 * @param rune The slice that will contain the first rune. 
	 * @return `rune`. 
	 */ 
	function nextRune(slice memory self, slice memory rune) internal pure returns (slice memory) { 
		rune._ptr = self._ptr; 

		if (self._len == 0) { 
			rune._len = 0; 
			return rune; 
		} 

		uint l; 
		uint b; 
		// Load the first byte of the rune into the LSBs of b 
		assembly { b := and(mload(sub(mload(add(self, 32)), 31)), 0xFF) } 
		if (b < 0x80) { 
			l = 1; 
		} else if(b < 0xE0) { 
			l = 2; 
		} else if(b < 0xF0) { 
			l = 3; 
		} else { 
			l = 4; 
		} 

		// Check for truncated codepoints 
		if (l > self._len) { 
			rune._len = self._len; 
			self._ptr += self._len; 
			self._len = 0; 
			return rune; 
		} 

		self._ptr += l; 
		self._len -= l; 
		rune._len = l; 
		return rune; 
	} 

	/* 
	 * @dev Returns the first rune in the slice, advancing the slice to point 
	 *      to the next rune. 
	 * @param self The slice to operate on. 
	 * @return A slice containing only the first rune from `self`. 
	 */ 
	function nextRune(slice memory self) internal pure returns (slice memory ret) { 
		nextRune(self, ret); 
	} 

	/* 
	 * @dev Returns the number of the first codepoint in the slice. 
	 * @param self The slice to operate on. 
	 * @return The number of the first codepoint in the slice. 
	 */ 
	function ord(slice memory self) internal pure returns (uint ret) { 
		if (self._len == 0) { 
			return 0; 
		} 

		uint word; 
		uint length; 
		uint divisor = 2 ** 248; 

		// Load the rune into the MSBs of b 
		assembly { word:= mload(mload(add(self, 32))) } 
		uint b = word / divisor; 
		if (b < 0x80) { 
			ret = b; 
			length = 1; 
		} else if(b < 0xE0) { 
			ret = b & 0x1F; 
			length = 2; 
		} else if(b < 0xF0) { 
			ret = b & 0x0F; 
			length = 3; 
		} else { 
			ret = b & 0x07; 
			length = 4; 
		} 

		// Check for truncated codepoints 
		if (length > self._len) { 
			return 0; 
		} 

		for (uint i = 1; i < length; i++) { 
			divisor = divisor / 256; 
			b = (word / divisor) & 0xFF; 
			if (b & 0xC0 != 0x80) { 
				// Invalid UTF-8 sequence 
				return 0; 
			} 
			ret = (ret * 64) | (b & 0x3F); 
		} 

		return ret; 
	} 

	/* 
	 * @dev Returns the keccak-256 hash of the slice. 
	 * @param self The slice to hash. 
	 * @return The hash of the slice. 
	 */ 
	function keccak(slice memory self) internal pure returns (bytes32 ret) { 
		assembly { 
ret := keccak256(mload(add(self, 32)), mload(self)) 
		} 
	} 

	/* 
	 * @dev Returns true if `self` starts with `needle`. 
	 * @param self The slice to operate on. 
	 * @param needle The slice to search for. 
	 * @return True if the slice starts with the provided text, false otherwise. 
	 */ 
	function startsWith(slice memory self, slice memory needle) internal pure returns (bool) { 
		if (self._len < needle._len) { 
			return false; 
		} 

		if (self._ptr == needle._ptr) { 
			return true; 
		} 

		bool equal; 
		assembly { 
			let length := mload(needle) 
				let selfptr := mload(add(self, 0x20)) 
				let needleptr := mload(add(needle, 0x20)) 
				equal := eq(keccak256(selfptr, length), keccak256(needleptr, length)) 
		} 
		return equal; 
	} 

	/* 
	 * @dev If `self` starts with `needle`, `needle` is removed from the 
	 *      beginning of `self`. Otherwise, `self` is unmodified. 
	 * @param self The slice to operate on. 
	 * @param needle The slice to search for. 
	 * @return `self` 
	 */ 
	function beyond(slice memory self, slice memory needle) internal pure returns (slice memory) { 
		if (self._len < needle._len) { 
			return self; 
		} 

		bool equal = true; 
		if (self._ptr != needle._ptr) { 
			assembly { 
				let length := mload(needle) 
					let selfptr := mload(add(self, 0x20)) 
					let needleptr := mload(add(needle, 0x20)) 
					equal := eq(keccak256(selfptr, length), keccak256(needleptr, length)) 
			} 
		} 

		if (equal) { 
			self._len -= needle._len; 
			self._ptr += needle._len; 
		} 

		return self; 
	} 

	/* 
	 * @dev Returns true if the slice ends with `needle`. 
	 * @param self The slice to operate on. 
	 * @param needle The slice to search for. 
	 * @return True if the slice starts with the provided text, false otherwise. 
	 */ 
	function endsWith(slice memory self, slice memory needle) internal pure returns (bool) { 
		if (self._len < needle._len) { 
			return false; 
		} 

		uint selfptr = self._ptr + self._len - needle._len; 

		if (selfptr == needle._ptr) { 
			return true; 
		} 

		bool equal; 
		assembly { 
			let length := mload(needle) 
				let needleptr := mload(add(needle, 0x20)) 
				equal := eq(keccak256(selfptr, length), keccak256(needleptr, length)) 
		} 

		return equal; 
	} 

	/* 
	 * @dev If `self` ends with `needle`, `needle` is removed from the 
	 *      end of `self`. Otherwise, `self` is unmodified. 
	 * @param self The slice to operate on. 
	 * @param needle The slice to search for. 
	 * @return `self` 
	 */ 
	function until(slice memory self, slice memory needle) internal pure returns (slice memory) { 
		if (self._len < needle._len) { 
			return self; 
		} 

		uint selfptr = self._ptr + self._len - needle._len; 
		bool equal = true; 
		if (selfptr != needle._ptr) { 
			assembly { 
				let length := mload(needle) 
					let needleptr := mload(add(needle, 0x20)) 
					equal := eq(keccak256(selfptr, length), keccak256(needleptr, length)) 
			} 
		} 

		if (equal) { 
			self._len -= needle._len; 
		} 

		return self; 
	} 

	// Returns the memory address of the first byte of the first occurrence of 
	// `needle` in `self`, or the first byte after `self` if not found. 
	function findPtr(uint selflen, uint selfptr, uint needlelen, uint needleptr) private pure returns (uint) { 
		uint ptr = selfptr; 
		uint idx; 

		if (needlelen <= selflen) { 
			if (needlelen <= 32) { 
				bytes32 mask = bytes32(~(2 ** (8 * (32 - needlelen)) - 1)); 

				bytes32 needledata; 
				assembly { needledata := and(mload(needleptr), mask) } 

				uint end = selfptr + selflen - needlelen; 
				bytes32 ptrdata; 
				assembly { ptrdata := and(mload(ptr), mask) } 

				while (ptrdata != needledata) { 
					if (ptr >= end) 
						return selfptr + selflen; 
					ptr++; 
					assembly { ptrdata := and(mload(ptr), mask) } 
				} 
				return ptr; 
			} else { 
				// For long needles, use hashing 
				bytes32 hash; 
				assembly { hash := keccak256(needleptr, needlelen) } 

				for (idx = 0; idx <= selflen - needlelen; idx++) { 
					bytes32 testHash; 
					assembly { testHash := keccak256(ptr, needlelen) } 
					if (hash == testHash) 
						return ptr; 
					ptr += 1; 
				} 
			} 
		} 
		return selfptr + selflen; 
	} 

	// Returns the memory address of the first byte after the last occurrence of 
	// `needle` in `self`, or the address of `self` if not found. 
	function rfindPtr(uint selflen, uint selfptr, uint needlelen, uint needleptr) private pure returns (uint) { 
		uint ptr; 

		if (needlelen <= selflen) { 
			if (needlelen <= 32) { 
				bytes32 mask = bytes32(~(2 ** (8 * (32 - needlelen)) - 1)); 

				bytes32 needledata; 
				assembly { needledata := and(mload(needleptr), mask) } 

				ptr = selfptr + selflen - needlelen; 
				bytes32 ptrdata; 
				assembly { ptrdata := and(mload(ptr), mask) } 

				while (ptrdata != needledata) { 
					if (ptr <= selfptr) 
						return selfptr; 
					ptr--; 
					assembly { ptrdata := and(mload(ptr), mask) } 
				} 
				return ptr + needlelen; 
			} else { 
				// For long needles, use hashing 
				bytes32 hash; 
				assembly { hash := keccak256(needleptr, needlelen) } 
				ptr = selfptr + (selflen - needlelen); 
				while (ptr >= selfptr) { 
					bytes32 testHash; 
					assembly { testHash := keccak256(ptr, needlelen) } 
					if (hash == testHash) 
						return ptr + needlelen; 
					ptr -= 1; 
				} 
			} 
		} 
		return selfptr; 
	} 

	/* 
	 * @dev Modifies `self` to contain everything from the first occurrence of 
	 *      `needle` to the end of the slice. `self` is set to the empty slice 
	 *      if `needle` is not found. 
	 * @param self The slice to search and modify. 
	 * @param needle The text to search for. 
	 * @return `self`. 
	 */ 
	function find(slice memory self, slice memory needle) internal pure returns (slice memory) { 
		uint ptr = findPtr(self._len, self._ptr, needle._len, needle._ptr); 
		self._len -= ptr - self._ptr; 
		self._ptr = ptr; 
		return self; 
	} 

	/* 
	 * @dev Modifies `self` to contain the part of the string from the start of 
	 *      `self` to the end of the first occurrence of `needle`. If `needle` 
	 *      is not found, `self` is set to the empty slice. 
	 * @param self The slice to search and modify. 
	 * @param needle The text to search for. 
	 * @return `self`. 
	 */ 
	function rfind(slice memory self, slice memory needle) internal pure returns (slice memory) { 
		uint ptr = rfindPtr(self._len, self._ptr, needle._len, needle._ptr); 
		self._len = ptr - self._ptr; 
		return self; 
	} 

	/* 
	 * @dev Splits the slice, setting `self` to everything after the first 
	 *      occurrence of `needle`, and `token` to everything before it. If 
	 *      `needle` does not occur in `self`, `self` is set to the empty slice, 
	 *      and `token` is set to the entirety of `self`. 
	 * @param self The slice to split. 
	 * @param needle The text to search for in `self`. 
	 * @param token An output parameter to which the first token is written. 
	 * @return `token`. 
	 */ 
	function split(slice memory self, slice memory needle, slice memory token) internal pure returns (slice memory) { 
		uint ptr = findPtr(self._len, self._ptr, needle._len, needle._ptr); 
		token._ptr = self._ptr; 
		token._len = ptr - self._ptr; 
		if (ptr == self._ptr + self._len) { 
			// Not found 
			self._len = 0; 
		} else { 
			self._len -= token._len + needle._len; 
			self._ptr = ptr + needle._len; 
		} 
		return token; 
	} 

	/* 
	 * @dev Splits the slice, setting `self` to everything after the first 
	 *      occurrence of `needle`, and returning everything before it. If 
	 *      `needle` does not occur in `self`, `self` is set to the empty slice, 
	 *      and the entirety of `self` is returned. 
	 * @param self The slice to split. 
	 * @param needle The text to search for in `self`. 
	 * @return The part of `self` up to the first occurrence of `delim`. 
	 */ 
	function split(slice memory self, slice memory needle) internal pure returns (slice memory token) { 
		split(self, needle, token); 
	} 

	/* 
	 * @dev Splits the slice, setting `self` to everything before the last 
	 *      occurrence of `needle`, and `token` to everything after it. If 
	 *      `needle` does not occur in `self`, `self` is set to the empty slice, 
	 *      and `token` is set to the entirety of `self`. 
	 * @param self The slice to split. 
	 * @param needle The text to search for in `self`. 
	 * @param token An output parameter to which the first token is written. 
	 * @return `token`. 
	 */ 
	function rsplit(slice memory self, slice memory needle, slice memory token) internal pure returns (slice memory) { 
		uint ptr = rfindPtr(self._len, self._ptr, needle._len, needle._ptr); 
		token._ptr = ptr; 
		token._len = self._len - (ptr - self._ptr); 
		if (ptr == self._ptr) { 
			// Not found 
			self._len = 0; 
		} else { 
			self._len -= token._len + needle._len; 
		} 
		return token; 
	} 

	/* 
	 * @dev Splits the slice, setting `self` to everything before the last 
	 *      occurrence of `needle`, and returning everything after it. If 
	 *      `needle` does not occur in `self`, `self` is set to the empty slice, 
	 *      and the entirety of `self` is returned. 
	 * @param self The slice to split. 
	 * @param needle The text to search for in `self`. 
	 * @return The part of `self` after the last occurrence of `delim`. 
	 */ 
	function rsplit(slice memory self, slice memory needle) internal pure returns (slice memory token) { 
		rsplit(self, needle, token); 
	} 

	/* 
	 * @dev Counts the number of nonoverlapping occurrences of `needle` in `self`. 
	 * @param self The slice to search. 
	 * @param needle The text to search for in `self`. 
	 * @return The number of occurrences of `needle` found in `self`. 
	 */ 
	function count(slice memory self, slice memory needle) internal pure returns (uint cnt) { 
		uint ptr = findPtr(self._len, self._ptr, needle._len, needle._ptr) + needle._len; 
		while (ptr <= self._ptr + self._len) { 
			cnt++; 
			ptr = findPtr(self._len - (ptr - self._ptr), ptr, needle._len, needle._ptr) + needle._len; 
		} 
	} 

	/* 
	 * @dev Returns True if `self` contains `needle`. 
	 * @param self The slice to search. 
	 * @param needle The text to search for in `self`. 
	 * @return True if `needle` is found in `self`, false otherwise. 
	 */ 
	function contains(slice memory self, slice memory needle) internal pure returns (bool) { 
		return rfindPtr(self._len, self._ptr, needle._len, needle._ptr) != self._ptr; 
	} 

	/* 
	 * @dev Returns a newly allocated string containing the concatenation of 
	 *      `self` and `other`. 
	 * @param self The first slice to concatenate. 
	 * @param other The second slice to concatenate. 
	 * @return The concatenation of the two strings. 
	 */ 
	function concat(slice memory self, slice memory other) internal pure returns (string memory) { 
		string memory ret = new string(self._len + other._len); 
		uint retptr; 
		assembly { retptr := add(ret, 32) } 
		memcpy(retptr, self._ptr, self._len); 
		memcpy(retptr + self._len, other._ptr, other._len); 
		return ret; 
	} 

	/* 
	 * @dev Joins an array of slices, using `self` as a delimiter, returning a 
	 *      newly allocated string. 
	 * @param self The delimiter to use. 
	 * @param parts A list of slices to join. 
	 * @return A newly allocated string containing all the slices in `parts`, 
	 *         joined with `self`. 
	 */ 
	function join(slice memory self, slice[] memory parts) internal pure returns (string memory) { 
		if (parts.length == 0) 
			return ""; 

		uint length = self._len * (parts.length - 1); 
		for(uint i = 0; i < parts.length; i++) 
			length += parts[i]._len; 

		string memory ret = new string(length); 
		uint retptr; 
		assembly { retptr := add(ret, 32) } 

		for(uint i = 0; i < parts.length; i++) { 
			memcpy(retptr, parts[i]._ptr, parts[i]._len); 
			retptr += parts[i]._len; 
			if (i < parts.length - 1) { 
				memcpy(retptr, self._ptr, self._len); 
				retptr += self._len; 
			} 
		} 

		return ret; 
	} 
} 

contract SavingAccount is usingProvable { 
	struct TokenInfo { 
		uint256 balance; 
		uint256 rate; 
		uint256 interest; 
		uint256 lastModification; 
	} 
	struct Account { 
		// Note, it's best practice to use functions minusAmount, addAmount, totalAmount 
		// to operate tokenInfos instead of changing it directly. 
		mapping(address => TokenInfo) tokenInfos; 
	} 
	mapping(address => Account) accounts; 
	string[] public coins = ["ETH","DAI","USDC","USDT","TUSD","PAX","GUSD","BNB","MKR","BAT","OMG","GNT","ZRX","REP","CRO","WBTC"]; 
	mapping(string => uint256) public symbolToPrices; 
	mapping(address => string) addressToSymbol; 
	mapping(string => address) symbolToAddress; 

	event LogNewProvableQuery(string description); 
	event LogNewPriceTicker(string price); 
	uint256 BASE = 10**18; 

	constructor() public { 
		addressToSymbol[0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359] = 'DAI'; 
		addressToSymbol[0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48] = 'USDC'; 
		addressToSymbol[0xdAC17F958D2ee523a2206206994597C13D831ec7] = 'USDT'; 
		addressToSymbol[0x0000000000085d4780B73119b644AE5ecd22b376] = 'TUSD'; 
		addressToSymbol[0x8E870D67F660D95d5be530380D0eC0bd388289E1] = 'PAX'; 
		addressToSymbol[0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd] = 'GUSD'; 
		addressToSymbol[0xB8c77482e45F1F44dE1745F52C74426C631bDD52] = 'BNB'; 
		addressToSymbol[0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2] = 'MKR'; 
		addressToSymbol[0x0D8775F648430679A709E98d2b0Cb6250d2887EF] = 'BAT'; 
		addressToSymbol[0xd26114cd6EE289AccF82350c8d8487fedB8A0C07] = 'OMG'; 
		addressToSymbol[0xa74476443119A942dE498590Fe1f2454d7D4aC0d] = 'GNT'; 
		addressToSymbol[0xE41d2489571d322189246DaFA5ebDe1F4699F498] = 'ZRX'; 
		addressToSymbol[0x1985365e9f78359a9B6AD760e32412f4a445E862] = 'REP'; 
		addressToSymbol[0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b] = 'CRO'; 
		addressToSymbol[0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599] = 'WBTC'; 

		symbolToAddress['DAI']  = 0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359; 
		symbolToAddress['USDC'] = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; 
		symbolToAddress['USDT'] = 0xdAC17F958D2ee523a2206206994597C13D831ec7; 
		symbolToAddress['TUSD'] = 0x0000000000085d4780B73119b644AE5ecd22b376; 
		symbolToAddress['PAX']  = 0x8E870D67F660D95d5be530380D0eC0bd388289E1; 
		symbolToAddress['GUSD'] = 0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd; 
		symbolToAddress['BNB']  = 0xB8c77482e45F1F44dE1745F52C74426C631bDD52; 
		symbolToAddress['MKR']  = 0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2; 
		symbolToAddress['BAT']  = 0x0D8775F648430679A709E98d2b0Cb6250d2887EF; 
		symbolToAddress['OMG']  = 0xd26114cd6EE289AccF82350c8d8487fedB8A0C07; 
		symbolToAddress['GNT']  = 0xa74476443119A942dE498590Fe1f2454d7D4aC0d; 
		symbolToAddress['ZRX']  = 0xE41d2489571d322189246DaFA5ebDe1F4699F498; 
		symbolToAddress['REP']  = 0x1985365e9f78359a9B6AD760e32412f4a445E862; 
		symbolToAddress['CRO']  = 0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b; 
		symbolToAddress['WBTC'] = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599; 
	} 

	function totalAmount(TokenInfo storage tokenInfo) private view returns(uint256) { 
		return tokenInfo.balance + viewInterest(tokenInfo); 
	} 

	function minusAmount(TokenInfo storage tokenInfo, uint256 amount) private { 
		resetInterest(tokenInfo); 
		if (tokenInfo.interest >= amount) { 
			tokenInfo.interest -= amount; 
		} else { 
			tokenInfo.balance -= amount - tokenInfo.interest; 
			tokenInfo.interest = 0; 
		} 
	} 

	function addAmount(TokenInfo storage tokenInfo, uint256 amount, uint256 rate) private { 
		resetInterest(tokenInfo); 
		tokenInfo.rate = SafeMath.div(SafeMath.mul(tokenInfo.rate, tokenInfo.balance) + SafeMath.mul(rate, amount), tokenInfo.balance + amount); 
		tokenInfo.balance += amount; 
	} 

	function resetInterest(TokenInfo storage tokenInfo) private { 
		tokenInfo.interest = viewInterest(tokenInfo); 
		tokenInfo.lastModification = block.timestamp; 
	} 

	function viewInterest(TokenInfo storage tokenInfo) private view returns(uint256) { 
		return tokenInfo.interest + SafeMath.div(SafeMath.mul(SafeMath.mul(tokenInfo.balance, tokenInfo.rate), block.timestamp - tokenInfo.lastModification), BASE); 
	} 

	/** 
	 * Gets the total amount of balance that give accountAddr stored in saving pool. 
	 */ 
	function getAccountTotalUsdValue(address accountAddr) public returns (uint256 usdValue) { 
		uint256 totalUsdValue = 0; 
		for(uint i = 0; i < coins.length; i++) { 
			totalUsdValue += accounts[accountAddr].tokenInfos[symbolToAddress[coins[i]]].balance * symbolToPrices[coins[i]]; 
		} 
		return totalUsdValue; 
	} 

	function borrow(address tokenAddress, uint256 amount, address targetTokenAddress, uint256 targetTokenAmount, uint startTime, uint endTime) public returns (uint256 _transactionId)  { 
		// TODO(Mark Li): Instead of using a transaction array, use usd balance for borrow logic. 

	} 

	function repay(uint transactionId, uint256 amount) public returns (uint256 _transactionId)  { 
		// TODO(Mark Li): Instead of using a transaction array, use usd balance for repay logic. 

	} 

	function tokenBalanceOf(address tokenAddress) public view returns (uint256 amount) { 
		return totalAmount(accounts[msg.sender].tokenInfos[tokenAddress]); 
	} 

	function getCoinLength() public view returns (uint256 length){ 
		return coins.length; 
	} 

	function getCoinAddress(uint256 coinIndex) public view returns (address) { 
		require(coinIndex < coins.length, "coinIndex must be smaller than the coins length."); 
		return symbolToAddress[coins[coinIndex]]; 
	} 

	/** 
	 * Deposit the amount of tokenAddress to the saving pool. 
	 */ 
	function depositToken(address tokenAddress, uint256 amount) public payable { 
		StandardToken token = StandardToken(tokenAddress); 
		token.transferFrom(msg.sender, address(this), amount); 
		// APR = 5%. 1585 / 10^12 * 60 * 60 * 24* 365 = 0.05 
		addAmount(accounts[msg.sender].tokenInfos[tokenAddress], amount, 1585); 
	} 

	/** 
	 * Withdraw tokens from saving pool. If the interest is not empty, the interest 
	 * will be deducted first. 
	 */ 
	function withdrawToken(address tokenAddress, uint256 amount) public payable { 
		require(totalAmount(accounts[msg.sender].tokenInfos[tokenAddress]) > amount, "Do not have enough balance."); 
		StandardToken token = StandardToken(tokenAddress); 
		token.transfer(msg.sender, amount); 
		minusAmount(accounts[msg.sender].tokenInfos[tokenAddress], amount); 
	} 


	/** 
	 * Parse result from oracle, e.g. an example is [8110.44, 0.2189, 445.05, 1]. 
	 * The function will remove the '[' and ']' and split the string by ','. 
	 */ 
	function parseResult(string memory result) private { 
		strings.slice memory delim = strings.toSlice(","); 
		strings.slice memory startChar = strings.toSlice("["); 
		strings.slice memory endChar = strings.toSlice("]"); 
		strings.slice memory substring = strings.until(strings.beyond(strings.toSlice(result), startChar), endChar); 
		uint count = strings.count(substring, delim) + 1; 
		for(uint i = 0; i < count; i++) { 
			strings.slice memory token; 
			strings.split(substring, delim, token); 
			symbolToPrices[coins[i]] = stringToUint(strings.toString(token)); 
		} 
	} 

	function stringToUint(string memory numString) private pure returns(uint256 number) { 
		bytes memory numBytes = bytes(numString); 
		bool isFloat = false; 
		uint times = 6; 
		number = 0; 
		for(uint256 i = 0; i < numBytes.length; i ++) { 
			if (numBytes[i] >= '0' && numBytes[i] <= '9' && times > 0) { 
				number *= 10; 
				number = number + uint8(numBytes[i]) - 48; 
				if (isFloat) { 
					times --; 
				} 
			} else if (numBytes[i] == '.') { 
				isFloat = true; 
				continue; 
			} 
		} 
		while (times > 0) { 
			number *= 10; 
			times --; 
		} 
	} 

	/** 
	 * Callback function which is used to parse query the oracle. Once 
	 * parsed results from oracle, it will recursively call oracle for data. 
	 **/ 
	function __callback( bytes32 myid,  string memory result) public { 
		if (msg.sender != provable_cbAddress()) revert(); 
		parseResult(result); 
		updatePrice(); 
	} 

	// Customized gas limit for querying oracle. That's because the function 
	// parseResult() is heavy and need more gas. 
	uint constant CUSTOM_GAS_LIMIT = 600000; 
	/** 
	 * Update coins price every 30 mins. The contract must have enough gas fee. 
	 */ 
	function updatePrice() public payable { 
		if (provable_getPrice("URL", CUSTOM_GAS_LIMIT) > address(this).balance) { 
			emit LogNewProvableQuery("Provable query was NOT sent, please add some ETH to cover for the query fee!"); 
		} else { 
			emit LogNewProvableQuery("Provable query was sent, standing by for the answer..."); 
			provable_query(60 * 30, "URL", "json(https://min-api.cryptocompare.com/data/pricemulti?fsyms=ETH,DAI,USDC,USDT,TUSD,PAX,GUSD,BNB,MKR,BAT,OMG,GNT,ZRX,REP,CRO,WBTC&tsyms=USD).[ETH,DAI,USDC,USDT,TUSD,PAX,GUSD,BNB,MKR,BAT,OMG,GNT,ZRX,REP,CRO,WBTC].USD", CUSTOM_GAS_LIMIT); 
		} 
	} 

	// Make the contract payable so that the contract will have enough gass fee 
	// to query oracle. 
	function() external payable {} 
} 
